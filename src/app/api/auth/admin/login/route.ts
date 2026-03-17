import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyPin, getPinHash, getAdminId } from '@/lib/auth/pin'
import { signJwt, ADMIN_COOKIE, ADMIN_TTL_SEC, cookieOptions } from '@/lib/auth/jwt'
import { randomUUID } from 'crypto'

const schema = z.object({
  id: z.string().optional().default(''),
  pin: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값을 확인해 주세요.' }, { status: 400 })
  }

  // 관리자 아이디가 설정된 경우 검증 (미설정 시 PIN만으로 인증)
  const adminId = await getAdminId()
  if (adminId && parsed.data.id !== adminId) {
    return NextResponse.json({ error: '관리자 정보가 올바르지 않습니다.' }, { status: 401 })
  }

  const hash = await getPinHash('admin_pin_hash')
  if (!hash || !(await verifyPin(parsed.data.pin, hash))) {
    return NextResponse.json({ error: '관리자 정보가 올바르지 않습니다.' }, { status: 401 })
  }

  const sessionId = randomUUID()
  const token = await signJwt('admin', sessionId)
  const res = NextResponse.json({ success: true, role: 'admin' })
  res.cookies.set(ADMIN_COOKIE, token, cookieOptions(ADMIN_TTL_SEC))
  return res
}
