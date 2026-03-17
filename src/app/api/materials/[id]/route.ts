import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { invalidateCache } from '@/lib/cache/revalidate'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    is_active: z.boolean().optional(),
    sort_order: z.number().int().min(0).max(99).optional(),
  })
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }
  const db = createServerClient()
  const { data, error } = await db
    .from('materials')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', Number(id))
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await invalidateCache('materials')
  return NextResponse.json({ material: data })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = createServerClient()
  const { error } = await db.from('materials').delete().eq('id', Number(id))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await invalidateCache('materials')
  return NextResponse.json({ success: true })
}
