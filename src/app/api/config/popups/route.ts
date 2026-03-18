import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { verifyJwt, ADMIN_COOKIE } from '@/lib/auth/jwt'

const getAllPopups = unstable_cache(
  async () => {
    const db = createServerClient()
    const { data } = await db.from('popup_content').select('*').order('popup_key')
    return data ?? []
  },
  ['popups-all'],
  { tags: ['popups'], revalidate: 600 },
)

const getActivePopups = unstable_cache(
  async () => {
    const db = createServerClient()
    const { data } = await db
      .from('popup_content')
      .select('*')
      .eq('is_active', true)
      .order('popup_key')
    return data ?? []
  },
  ['popups-active'],
  { tags: ['popups'], revalidate: 600 },
)

const patchSchema = z.object({
  popup_key: z.string(),
  title: z.string().max(100).optional(),
  body: z.string().max(5000).optional(),
  is_active: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  const payload = token ? await verifyJwt(token) : null
  const data = payload?.role === 'admin' ? await getAllPopups() : await getActivePopups()
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  const payload = token ? await verifyJwt(token) : null
  if (!payload || payload.role !== 'admin') {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

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
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  revalidateTag('popups')
  return NextResponse.json(data)
}
