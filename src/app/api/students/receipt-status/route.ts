import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, Number(sp.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 50)))
  const search = sp.get('search') ?? ''
  const offset = (page - 1) * limit

  const db = createServerClient()

  // 활성 자료 목록
  const { data: materials } = await db
    .from('materials')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  // 학생 목록 (페이지네이션 + 검색)
  let studentsQuery = db
    .from('students')
    .select('id, name, exam_number, series, region', { count: 'exact' })
    .order('name')

  if (search) {
    const escaped = search.replace(/[%_\\]/g, '\\$&')
    studentsQuery = studentsQuery.or(
      `name.ilike.%${escaped}%,phone.ilike.%${escaped}%,exam_number.ilike.%${escaped}%`
    )
  }

  const { data: students, count, error } = await studentsQuery.range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!students?.length) {
    return NextResponse.json({ students: [], materials: materials ?? [], total: count ?? 0 })
  }

  // 해당 학생들의 배부 이력 (전체, material_id만 필요)
  const studentIds = students.map(s => s.id)
  const { data: logs } = await db
    .from('distribution_logs')
    .select('student_id, material_id')
    .in('student_id', studentIds)

  // student_id → received material_id Set
  const receiptMap: Record<string, Set<number>> = {}
  for (const log of logs ?? []) {
    if (!receiptMap[log.student_id]) receiptMap[log.student_id] = new Set()
    receiptMap[log.student_id].add(log.material_id)
  }

  const result = students.map(s => ({
    ...s,
    received_ids: [...(receiptMap[s.id] ?? [])],
  }))

  return NextResponse.json({ students: result, materials: materials ?? [], total: count ?? 0 })
}
