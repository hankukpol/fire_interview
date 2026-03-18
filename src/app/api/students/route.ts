import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { normalizePhone, normalizeName } from '@/lib/utils'
import { invalidateCache } from '@/lib/cache/revalidate'

const studentSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
  exam_number: z.string().optional().default(''),
  gender: z.string().optional().default(''),
  region: z.string().optional().default(''),
  series: z.string().optional().default(''),
})

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, Number(sp.get('page') ?? 1))
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit') ?? 20)))
  const search = sp.get('search') ?? ''
  const offset = (page - 1) * limit

  const db = createServerClient()
  let q = db.from('students').select('*', { count: 'exact' }).order('name')

  if (search) {
    const escaped = search.replace(/[%_\\]/g, '\\$&')
    q = q.or(`name.ilike.%${escaped}%,phone.ilike.%${escaped}%,exam_number.ilike.%${escaped}%`)
  }

  const { data, count, error } = await q.range(offset, offset + limit - 1)
  if (error) return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  return NextResponse.json({ students: data, total: count })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = studentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }

  const db = createServerClient()
  const { data, error } = await db
    .from('students')
    .insert({
      name: normalizeName(parsed.data.name),
      phone: normalizePhone(parsed.data.phone),
      exam_number: parsed.data.exam_number || null,
      gender: parsed.data.gender || null,
      region: parsed.data.region || null,
      series: parsed.data.series || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '이미 등록된 학생입니다 (이름+연락처 중복).' }, { status: 409 })
    }
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }

  await invalidateCache('students')
  return NextResponse.json({ student: data }, { status: 201 })
}
