import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const db = createServerClient()

  const [
    { count: totalStudents },
    { data: materials, error: materialsError },
    { data: logs, error: logsError },
  ] = await Promise.all([
    db.from('students').select('*', { count: 'exact', head: true }),
    db.from('materials').select('id,name,is_active').eq('is_active', true).order('sort_order'),
    db.from('distribution_logs').select('material_id, student_id'),
  ])

  if (materialsError || logsError) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  const materialStudentMap: Record<number, Set<string>> = {}
  for (const log of logs ?? []) {
    if (!materialStudentMap[log.material_id]) materialStudentMap[log.material_id] = new Set()
    materialStudentMap[log.material_id].add(log.student_id)
  }

  return NextResponse.json(
    {
      totalStudents: totalStudents ?? 0,
      byMaterial: (materials ?? []).map((material) => ({
        id: material.id,
        name: material.name,
        count: materialStudentMap[material.id]?.size ?? 0,
      })),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
