'use client'

import { useEffect, useState, useCallback } from 'react'

interface Stats {
  totalStudents: number
  byMaterial: { id: number; name: string; count: number }[]
}

export default function MonitorPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [lastUpdated, setLastUpdated] = useState('')

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/monitor/stats', { cache: 'no-store' })
    if (!res.ok) throw new Error('monitor_stats_failed')

    const data: Stats = await res.json()
    setStats(data)
    setLastUpdated(new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }))
  }, [])

  useEffect(() => {
    fetchStats().catch(() => {})
    const timer = setInterval(() => {
      fetchStats().catch(() => {})
    }, 15000)
    return () => clearInterval(timer)
  }, [fetchStats])

  const total = stats?.totalStudents ?? 0

  return (
    <div className="min-h-dvh bg-gray-950 text-white p-8 xl:p-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight text-sky-300 xl:text-4xl">
            Material Distribution Status
          </h1>
          <div className="text-right">
            <div className="text-4xl font-bold text-white xl:text-5xl">{total}</div>
            <div className="mt-1 text-sm text-gray-400">Total students</div>
            <div className="mt-1 text-xs text-gray-600">Updated: {lastUpdated}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {stats?.byMaterial.map((material) => {
            const pct = total > 0 ? (material.count / total) * 100 : 0
            const remaining = total - material.count

            return (
              <div key={material.id} className="border border-gray-800 bg-gray-900 p-6">
                <div className="mb-4 flex items-start justify-between">
                  <h2 className="text-lg font-bold text-white">{material.name}</h2>
                  <span
                    className="text-3xl font-bold"
                    style={{ color: pct >= 100 ? '#4caf50' : '#90caf9' }}
                  >
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="mb-3 h-3 w-full bg-gray-800">
                  <div
                    className="h-3 transition-all duration-1000"
                    style={{ width: `${pct}%`, background: pct >= 100 ? '#4caf50' : '#1565c0' }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-green-400">{material.count} received</span>
                  <span className="text-gray-500">{remaining} remaining</span>
                </div>
              </div>
            )
          })}
        </div>

        {!stats && (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}
