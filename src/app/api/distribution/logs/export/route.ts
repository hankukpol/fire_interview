import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

interface JoinedStudent {
  name: string
  phone: string
  exam_number: string | null
  series: string | null
  region: string | null
}

interface JoinedMaterial {
  name: string
}

// CSV 셀 이스케이프: 따옴표·줄바꿈 처리
const esc = (v: string | null | undefined): string => {
  const str = String(v ?? '').replace(/\r\n/g, ' ').replace(/[\r\n]/g, ' ').replace(/"/g, '""')
  return `"${str}"`
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const dateFrom = sp.get('date_from') ?? today
  const dateTo   = sp.get('date_to')   ?? today

  // 날짜 형식 기본 검증 (YYYY-MM-DD)
  const datePattern = /^\d{4}-\d{2}-\d{2}$/
  if (!datePattern.test(dateFrom) || !datePattern.test(dateTo)) {
    return NextResponse.json({ error: '날짜 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const db = createServerClient()
  const { data, error } = await db
    .from('distribution_logs')
    .select('id, distributed_at, distributed_by, note, students(name, phone, exam_number, series, region), materials(name)')
    .gte('distributed_at', `${dateFrom}T00:00:00+09:00`)
    .lte('distributed_at', `${dateTo}T23:59:59.999+09:00`)
    .order('distributed_at', { ascending: false })
    .limit(5000)

  if (error) return NextResponse.json({ error: '데이터를 불러오지 못했습니다.' }, { status: 500 })

  const rows = data ?? []
  const header = ['ID', '배부일시(KST)', '학생명', '연락처', '수험번호', '직렬', '지역', '자료명', '처리자', '메모']
  const lines = [
    header.join(','),
    ...rows.map(r => {
      const s = r.students as unknown as JoinedStudent | null
      const m = r.materials as unknown as JoinedMaterial | null
      const kst = new Date(r.distributed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      return [r.id, esc(kst), esc(s?.name), esc(s?.phone), esc(s?.exam_number), esc(s?.series), esc(s?.region), esc(m?.name), esc(r.distributed_by), esc(r.note)].join(',')
    }),
  ]

  const bom = '\uFEFF'
  const filename = `distribution_logs_${dateFrom}${dateFrom !== dateTo ? `_${dateTo}` : ''}.csv`
  return new NextResponse(bom + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
