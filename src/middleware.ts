import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt, STAFF_COOKIE, ADMIN_COOKIE } from '@/lib/auth/jwt'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 이미 인증된 관리자가 로그인 페이지 접근 시 대시보드로 자동 리디렉션
  if (pathname === '/admin/login') {
    const token = req.cookies.get(ADMIN_COOKIE)?.value
    if (token) {
      const payload = await verifyJwt(token)
      if (payload?.role === 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }
    return NextResponse.next()
  }

  // 직원 보호 경로
  const isStaffPath =
    pathname.startsWith('/scan') ||
    pathname.startsWith('/api/distribution/scan') ||
    pathname.startsWith('/api/distribution/manual') ||
    pathname.startsWith('/api/distribution/quick')

  // 학생도 접근 가능한 공개 API (인증 불필요)
  const isPublicApiRoute =
    pathname === '/api/students/lookup' ||
    /^\/api\/students\/[^/]+\/receipts$/.test(pathname) ||
    (pathname.startsWith('/api/materials') && req.method === 'GET')

  // 관리자 보호 경로 (GET /api/config/popups 는 학생도 접근 가능하므로 제외)
  const isAdminPath =
    !isPublicApiRoute && (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/api/students') ||
      pathname.startsWith('/api/materials') ||
      pathname.startsWith('/api/distribution/logs') ||
      pathname.startsWith('/api/distribution/unreceived') ||
      pathname.startsWith('/api/config/cache') ||
      pathname.startsWith('/api/auth/admin/logout') ||
      pathname.startsWith('/api/auth/staff/pin') ||
      pathname.startsWith('/api/auth/admin/pin') ||
      pathname.startsWith('/api/auth/admin/id')
    )

  if (isAdminPath) {
    const token = req.cookies.get(ADMIN_COOKIE)?.value
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    const payload = await verifyJwt(token)
    if (!payload || payload.role !== 'admin') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }

  if (isStaffPath) {
    const staffToken = req.cookies.get(STAFF_COOKIE)?.value
    const adminToken = req.cookies.get(ADMIN_COOKIE)?.value

    const staffPayload = staffToken ? await verifyJwt(staffToken) : null
    const adminPayload = adminToken ? await verifyJwt(adminToken) : null

    const authorized =
      (staffPayload && staffPayload.role === 'staff') ||
      (adminPayload && adminPayload.role === 'admin')

    if (!authorized) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: '직원 인증이 필요합니다.' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/staff/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/login',
    '/scan/:path*',
    '/dashboard/:path*',
    '/api/students/:path*',
    '/api/materials/:path*',
    '/api/distribution/:path*',
    '/api/config/:path*',
    '/api/auth/admin/logout',
    '/api/auth/staff/pin',
    '/api/auth/admin/pin',
    '/api/auth/admin/id',
  ],
}
