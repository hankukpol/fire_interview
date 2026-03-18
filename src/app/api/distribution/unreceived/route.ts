import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const materialId = req.nextUrl.searchParams.get('material_id')
  if (!materialId) {
    return NextResponse.json({ error: 'material_id가 필요합니다.' }, { status: 400 })
  }

  const db = createServerClient()

  const [{ data: received }, { data: students, error }] = await Promise.all([
    db
      .from('distribution_logs')
      .select('student_id')
      .eq('material_id', Number(materialId)),
    db
      .from('students')
      .select('id,name,phone,exam_number,series,region', { count: 'exact' })
      .order('name'),
  ])

  if (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  const receivedIds = new Set((received ?? []).map((row) => row.student_id))
  const unreceived = (students ?? []).filter((student) => !receivedIds.has(student.id))

  return NextResponse.json({ students: unreceived, total: unreceived.length })
}
