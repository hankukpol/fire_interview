'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/students', label: '학생 명단' },
  { href: '/dashboard/materials', label: '자료 설정' },
  { href: '/dashboard/logs', label: '배부 로그' },
  { href: '/dashboard/config', label: '설정' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh bg-gray-50">
      {/* 사이드바 */}
      <aside className="hidden md:flex flex-col w-56 xl:w-64 bg-white border-r border-gray-200 shrink-0">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="text-sm font-bold tracking-tight" style={{ color: 'var(--theme)' }}>
            관리자 대시보드
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
            return (
              <Link
                key={n.href}
                href={n.href}
                className="px-3 py-2.5 text-sm transition-colors"
                style={active ? { background: 'var(--theme)', color: '#fff', fontWeight: 600 } : { color: '#374151' }}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-200">
          <button
            onClick={async () => {
              await fetch('/api/auth/admin/logout', { method: 'POST' })
              window.location.href = '/admin/login'
            }}
            className="w-full px-3 py-2.5 text-sm text-gray-400 hover:text-red-500 text-left transition-colors"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 상단 네비게이션 */}
      <div className="flex flex-col flex-1 min-w-0">
        <nav className="md:hidden flex overflow-x-auto bg-white border-b border-gray-200 px-2 py-1 gap-1">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-6 xl:p-10 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
