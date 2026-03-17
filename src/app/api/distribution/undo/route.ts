import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  student_id: z.string().uuid(),
  material_id: z.number().int().positive(),
})

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const { student_id, material_id } = parsed.data
  const db = createServerClient()

  // 가장 최근 배부 로그 찾기
  const { data: log } = await db
    .from('distribution_logs')
    .select('id')
    .eq('student_id', student_id)
    .eq('material_id', material_id)
    .order('distributed_at', { ascending: false })
    .limit(1)
    .single()

  if (!log) return NextResponse.json({ error: '배부 기록이 없습니다.' }, { status: 404 })

  const { error } = await db.from('distribution_logs').delete().eq('id', log.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
