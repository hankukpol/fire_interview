import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { unstable_cache } from 'next/cache'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const getPopups = unstable_cache(
  async () => {
    const db = createServerClient()
    const { data } = await db.from('popup_content').select('*').order('popup_key')
    return data ?? []
  },
  ['popups'],
  { tags: ['popups'], revalidate: 600 }
)

export async function GET() {
  const data = await getPopups()
  return NextResponse.json(data)
}

const patchSchema = z.object({
  popup_key: z.string(),
  title: z.string().max(100).optional(),
  body: z.string().max(5000).optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }

  const { popup_key, ...rest } = parsed.data
  const updates: Record<string, unknown> = { ...rest, updated_at: new Date().toISOString() }

  const db = createServerClient()
  const { data, error } = await db
    .from('popup_content')
    .update(updates)
    .eq('popup_key', popup_key)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidateTag('popups')
  return NextResponse.json(data)
}
