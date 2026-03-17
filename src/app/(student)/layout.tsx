'use client'

import { useEffect } from 'react'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    fetch('/api/config/app')
      .then(r => r.json())
      .then((cfg: { app_name?: string; theme_color?: string }) => {
        if (cfg.theme_color) {
          document.documentElement.style.setProperty('--theme', cfg.theme_color)
        }
        if (cfg.app_name) {
          document.title = cfg.app_name
        }
      })
      .catch(() => {})
  }, [])

  return (
    <main className="min-h-dvh bg-white">
      <div className="w-full max-w-none mx-auto md:max-w-[768px] md:mx-auto">
        {children}
      </div>
    </main>
  )
}
