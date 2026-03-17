import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getTodayKey } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const materialId = req.nextUrl.searchParams.get('material_id')
  if (!materialId) return NextResponse.json({ error: 'material_id 필요' }, { status: 400 })

  const db = createServerClient()
  const today = getTodayKey()

  // 오늘 해당 자료를 받은 student_id 목록
  const { data: received } = await db
    .from('distribution_logs')
    .select('student_id')
    .eq('material_id', Number(materialId))
    .gte('distributed_at', `${today}T00:00:00`)

  const receivedIds = (received ?? []).map(r => r.student_id)

  // 전체 학생 중 미수령자
  let q = db.from('students').select('id,name,phone,exam_number,series,region').order('name')
  if (receivedIds.length > 0) {
    q = q.not('id', 'in', `(${receivedIds.join(',')})`)
  }

  const { data, count, error } = await q.limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ students: data ?? [], total: count ?? (data?.length ?? 0) })
}
