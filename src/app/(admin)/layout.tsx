'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: '대시보드' },
  { href: '/dashboard/students', label: '학생 명단' },
  { href: '/dashboard/materials', label: '자료 설정' },
  { href: '/dashboard/logs', label: '배부 로그' },
  { href: '/dashboard/unreceived', label: '미수령 조회' },
  { href: '/dashboard/config', label: '설정' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh bg-[#f8f9fa] font-sans">
      {/* 사이드바 */}
      <aside className="hidden md:flex flex-col w-56 xl:w-64 bg-[#111827] shrink-0 border-r border-[#1f2937]">
        <div className="px-5 py-4 bg-[#1f2937] flex items-center gap-3">
          <div className="w-7 h-7 bg-blue-600 text-white flex items-center justify-center font-bold text-sm">M</div>
          <div className="text-sm font-bold text-white tracking-widest">Morning Mock</div>
        </div>
        
        <div className="px-5 py-6 border-b border-[#374151]/50 bg-[#111827]">
          <div className="text-sm font-medium text-slate-200">한국경찰학원</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">kma@hanmail.net</div>
          <div className="mt-4 flex">
            <span className="px-2 py-1.5 text-[10px] text-blue-400 border border-blue-500/30 bg-blue-900/20 font-medium tracking-wide">최고 관리자</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 flex flex-col gap-1 overflow-y-auto">
          <div className="px-3 pb-3 text-[10px] font-bold text-slate-500 tracking-wider">메인 메뉴</div>
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-2.5 text-sm transition-colors ${
                  active 
                    ? 'text-white font-semibold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#374151]/50">
          <button
            onClick={async () => {
              await fetch('/api/auth/admin/logout', { method: 'POST' })
              window.location.href = '/admin/login'
            }}
            className="w-full px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-slate-800 text-left transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 모바일 상단 네비게이션 */}
      <div className="flex flex-col flex-1 min-w-0">
        <div className="md:hidden bg-[#111827] px-4 py-3 flex items-center justify-between border-b border-[#1f2937]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">M</div>
            <div className="text-xs font-bold text-white tracking-widest">Morning Mock</div>
          </div>
          <button
            onClick={async () => {
              await fetch('/api/auth/admin/logout', { method: 'POST' })
              window.location.href = '/admin/login'
            }}
            className="text-[10px] px-2 py-1 border border-slate-700 text-slate-400 hover:text-white"
          >
            로그아웃
          </button>
        </div>
        <nav className="md:hidden flex overflow-x-auto bg-[#1f2937] px-2 py-2 gap-2">
          {NAV.map(n => {
            const active = pathname === n.href || (n.href !== '/dashboard' && pathname.startsWith(n.href))
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`shrink-0 px-3 py-1.5 text-[11px] transition-colors border ${
                  active ? 'bg-blue-600 border-blue-600 text-white font-medium' : 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {n.label}
              </Link>
            )
          })}
        </nav>
        <main className="flex-1 p-5 md:p-8 xl:p-12 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
