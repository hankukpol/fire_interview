import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'
import { generateQrToken } from '@/lib/qr/token'
import { normalizePhone, normalizeName } from '@/lib/utils'
import { unstable_cache } from 'next/cache'

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10),
})

const getStudentByNamePhone = unstable_cache(
  async (name: string, phone: string) => {
    const db = createServerClient()
    const { data } = await db
      .from('students')
      .select('id,name,phone,exam_number,gender,region,series')
      .eq('name', name)
      .eq('phone', phone)
      .single()
    return data
  },
  ['student-lookup'],
  { tags: ['students'], revalidate: 1800 },
)

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }

  const name  = normalizeName(parsed.data.name)
  const phone = normalizePhone(parsed.data.phone)

  const student = await getStudentByNamePhone(name, phone)
  if (!student) {
    return NextResponse.json(
      { error: '이름 또는 연락처가 올바르지 않습니다.' },
      { status: 404 },
    )
  }

  const token = await generateQrToken(student.id)
  return NextResponse.json({ token, student })
}
