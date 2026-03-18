import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { verifyJwt, ADMIN_COOKIE } from '@/lib/auth/jwt'
import { invalidateCache } from '@/lib/cache/revalidate'

const getActiveMaterials = unstable_cache(
  async () => {
    const db = createServerClient()
    const { data } = await db.from('materials').select('*').eq('is_active', true).order('sort_order')
    return data ?? []
  },
  ['materials-active'],
  { tags: ['materials'], revalidate: 300 },
)

const getAllMaterials = unstable_cache(
  async () => {
    const db = createServerClient()
    const { data } = await db.from('materials').select('*').order('sort_order')
    return data ?? []
  },
  ['materials-all'],
  { tags: ['materials'], revalidate: 300 },
)

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1'

  if (all) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value
    const payload = token ? await verifyJwt(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }
  }

  const materials = all ? await getAllMaterials() : await getActiveMaterials()
  return NextResponse.json({ materials })
}

export async function POST(req: NextRequest) {
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().default(''),
    is_active: z.boolean().default(true),
    sort_order: z.number().int().min(0).max(99).default(0),
  })

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }

  const db = createServerClient()
  const { data, error } = await db.from('materials').insert(parsed.data).select().single()
  if (error) {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  await invalidateCache('materials')
  return NextResponse.json({ material: data }, { status: 201 })
}
