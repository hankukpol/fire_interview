import { NextResponse } from 'next/server'
import { invalidateCache } from '@/lib/cache/revalidate'

export async function POST() {
  invalidateCache('all')
  return NextResponse.json({ ok: true, message: '캐시가 초기화되었습니다.' })
}
