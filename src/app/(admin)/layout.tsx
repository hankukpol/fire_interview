'use client'

import Link from 'next/link'

const NAV = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/students', label: '학생 명단' },
  { href: '/dashboard/materials', label: '자료 설정' },
  { href: '/dashboard/logs', label: '배부 로그' },
  { href: '/dashboard/config', label: '설정' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-gray-50">
      {/* 사이드바 (데스크탑) */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-100 py-6 px-4 gap-1 shrink-0">
        <div className="text-base font-bold px-3 mb-4" style={{ color: 'var(--theme)' }}>
          관리자 대시보드
        </div>
        {NAV.map(n => (
          <Link
            key={n.href}
            href={n.href}
            className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-900 transition-colors"
          >
            {n.label}
          </Link>
        ))}
        <div className="mt-auto">
          <button
            onClick={async () => {
              await fetch('/api/auth/admin/logout', { method: 'POST' })
              window.location.href = '/admin/login'
            }}
            className="w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-500 text-left"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 상단 네비게이션 */}
      <div className="flex flex-col flex-1 min-w-0">
        <nav className="md:hidden flex overflow-x-auto bg-white border-b border-gray-100 px-2 py-1 gap-1">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="shrink-0 px-3 py-2 rounded-lg text-xs text-gray-600 hover:bg-blue-50"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
