import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { normalizePhone, normalizeName } from '@/lib/utils'
import { invalidateCache } from '@/lib/cache/revalidate'

const rowSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  exam_number: z.string().optional().default(''),
  gender: z.string().optional().default(''),
  region: z.string().optional().default(''),
  series: z.string().optional().default(''),
})

const bulkSchema = z.array(rowSchema).min(1).max(500)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }

  const rows = parsed.data.map(r => ({
    name: normalizeName(r.name),
    phone: normalizePhone(r.phone),
    exam_number: r.exam_number || null,
    gender: r.gender || null,
    region: r.region || null,
    series: r.series || null,
  })).filter(r => r.name && r.phone)

  const db = createServerClient()
  const { data, error } = await db
    .from('students')
    .upsert(rows, { onConflict: 'name,phone', ignoreDuplicates: true })
    .select()

  if (error) return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })

  const inserted = data?.length ?? 0
  const skipped = rows.length - inserted
  await invalidateCache('students')
  return NextResponse.json({ inserted, skipped, total: rows.length })
}
