import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  student_id: z.string().uuid(),
  material_id: z.number().int().positive(),
  note: z.string().max(200).default(''),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }

  const { student_id, material_id, note } = parsed.data

  const db = createServerClient()
  const { data, error } = await db.rpc('distribute_material', {
    p_student_id: student_id,
    p_material_id: material_id,
    p_staff_label: '관리자',
    p_note: note,
  })

  if (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  const result = data as { success: boolean; reason?: string; log_id?: number; material_name?: string; student_name?: string }

  if (!result.success) {
    const messages: Record<string, string> = {
      already_distributed_today: '오늘 이미 배부된 자료입니다.',
      student_not_found: '학생을 찾을 수 없습니다.',
      material_inactive: '비활성 자료입니다.',
    }
    return NextResponse.json(
      { error: messages[result.reason ?? ''] ?? '배부 처리에 실패했습니다.' },
      { status: 409 }
    )
  }

  return NextResponse.json(result)
}
