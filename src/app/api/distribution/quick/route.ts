import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { normalizePhone, normalizeName } from '@/lib/utils'
import { distributeMaterial } from '@/lib/distribution/materials'

const schema = z.object({
  exam_number: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  material_id: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }

  const { exam_number, name, phone, material_id } = parsed.data
  const db = createServerClient()

  let student: { id: string; name: string } | null = null

  if (exam_number) {
    const { data } = await db
      .from('students')
      .select('id,name')
      .eq('exam_number', exam_number.trim())
      .maybeSingle()
    student = data
  } else if (phone) {
    const normalized = normalizePhone(phone)
    let q = db.from('students').select('id,name').eq('phone', normalized)
    if (name) q = q.eq('name', normalizeName(name))
    const { data } = await q.maybeSingle()
    student = data
  }

  if (!student) {
    return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 })
  }

  try {
    const result = await distributeMaterial({
      studentId: student.id,
      materialId: material_id,
      distributedBy: '수동배부',
    })

    if (!result.success) {
      const msgs: Record<string, string> = {
        already_distributed: '이미 배부된 자료입니다.',
        material_inactive: '비활성 자료입니다.',
      }
      return NextResponse.json(
        { error: msgs[result.reason ?? ''] ?? '배부에 실패했습니다.' },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      student_name: result.student_name,
      material_name: result.material_name,
    })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
