import { NextRequest, NextResponse } from 'next/server'
import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

// GET: ?all=1 이면 비활성 포함 (관리자용), 기본은 활성만
export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get('all') === '1'
  const materials = all ? await getAllMaterials() : await getActiveMaterials()
  return NextResponse.json({ materials })
}

// 관리자 전용 POST
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
  if (error) return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  return NextResponse.json({ material: data }, { status: 201 })
}
