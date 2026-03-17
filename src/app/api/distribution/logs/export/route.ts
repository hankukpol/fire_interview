import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET() {
  const db = createServerClient()
  const { data, error } = await db
    .from('distribution_logs')
    .select('id, distributed_at, distributed_by, note, students(name, phone, exam_number, series, region), materials(name)')
    .order('distributed_at', { ascending: false })
    .limit(10000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const header = ['ID', '배부일시(KST)', '학생명', '연락처', '수험번호', '직렬', '지역', '자료명', '처리자', '메모']
  const lines = [
    header.join(','),
    ...rows.map(r => {
      const s = r.students as unknown as { name: string; phone: string; exam_number: string | null; series: string | null; region: string | null } | null
      const m = r.materials as unknown as { name: string } | null
      const kst = new Date(r.distributed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
      const esc = (v: string | null | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`
      return [r.id, esc(kst), esc(s?.name), esc(s?.phone), esc(s?.exam_number), esc(s?.series), esc(s?.region), esc(m?.name), esc(r.distributed_by), esc(r.note)].join(',')
    }),
  ]

  const bom = '\uFEFF'
  return new NextResponse(bom + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="distribution_logs_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}
