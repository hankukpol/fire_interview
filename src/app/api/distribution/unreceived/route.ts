import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const materialId = req.nextUrl.searchParams.get('material_id')
  if (!materialId) return NextResponse.json({ error: 'material_id 필요' }, { status: 400 })

  const db = createServerClient()
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })

  // 오늘(KST) 해당 자료를 받은 student_id 목록
  const { data: received } = await db
    .from('distribution_logs')
    .select('student_id')
    .eq('material_id', Number(materialId))
    .gte('distributed_at', `${today}T00:00:00+09:00`)
    .lte('distributed_at', `${today}T23:59:59.999+09:00`)

  const receivedIds = (received ?? []).map(r => r.student_id)

  // 전체 학생 중 미수령자 (전체 반환)
  let q = db
    .from('students')
    .select('id,name,phone,exam_number,series,region', { count: 'exact' })
    .order('name')

  if (receivedIds.length > 0) {
    q = q.not('id', 'in', `(${receivedIds.join(',')})`)
  }

  const { data, count, error } = await q
  if (error) return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  return NextResponse.json({ students: data ?? [], total: count ?? 0 })
}
