// 수험번호 또는 이름+연락처로 학생 조회 후 바로 배부
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { normalizePhone, normalizeName } from '@/lib/utils'

const schema = z.object({
  exam_number: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  material_id: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })

  const { exam_number, name, phone, material_id } = parsed.data
  const db = createServerClient()

  let student: { id: string; name: string } | null = null

  if (exam_number) {
    const { data } = await db.from('students').select('id,name').eq('exam_number', exam_number.trim()).maybeSingle()
    student = data
  } else if (name && phone) {
    const { data } = await db.from('students').select('id,name')
      .eq('name', normalizeName(name)).eq('phone', normalizePhone(phone)).maybeSingle()
    student = data
  }

  if (!student) return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 })

  const { data, error } = await db.rpc('distribute_material', {
    p_student_id: student.id,
    p_material_id: material_id,
    p_staff_label: '수동배부',
    p_note: '',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = data as { success: boolean; reason?: string; material_name?: string; student_name?: string }
  if (!result.success) {
    const msgs: Record<string, string> = {
      already_distributed_today: '오늘 이미 배부된 자료입니다.',
      material_inactive: '비활성 자료입니다.',
    }
    return NextResponse.json({ error: msgs[result.reason ?? ''] ?? '배부 실패' }, { status: 409 })
  }

  return NextResponse.json({ success: true, student_name: result.student_name, material_name: result.material_name })
}
