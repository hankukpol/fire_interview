'use client'

import { useEffect, useState, useCallback } from 'react'

interface Material { id: number; name: string; is_active: boolean }
interface Stats {
  totalStudents: number
  byMaterial: { id: number; name: string; count: number }[]
}

export default function MonitorPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [materials, setMaterials] = useState<Material[]>([])
  const [lastUpdated, setLastUpdated] = useState('')

  const fetchStats = useCallback(async () => {
    const [mRes, sRes] = await Promise.all([
      fetch('/api/materials'),
      fetch('/api/students?limit=1'),
    ])
    const mData = await mRes.json()
    const sData = await sRes.json()
    const active: Material[] = (mData.materials ?? []).filter((m: Material) => m.is_active)
    setMaterials(active)

    // 각 자료별 오늘 수령 인원
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
    const counts = await Promise.all(
      active.map(m =>
        fetch(`/api/distribution/unreceived?material_id=${m.id}`)
          .then(r => r.json())
          .then(d => ({ id: m.id, name: m.name, unreceived: d.total ?? d.students?.length ?? 0 }))
      )
    )
    const total = sData.total ?? 0
    setStats({
      totalStudents: total,
      byMaterial: counts.map(c => ({ id: c.id, name: c.name, count: total - c.unreceived })),
    })
    setLastUpdated(new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' }))
  }, [])

  useEffect(() => {
    fetchStats()
    const t = setInterval(fetchStats, 15000)
    return () => clearInterval(t)
  }, [fetchStats])

  const total = stats?.totalStudents ?? 0

  return (
    <div className="min-h-dvh bg-gray-950 text-white p-8 xl:p-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-3xl xl:text-4xl font-bold tracking-tight" style={{ color: '#90caf9' }}>
            자료 배부 현황판
          </h1>
          <div className="text-right">
            <div className="text-4xl xl:text-5xl font-bold text-white">{total}명</div>
            <div className="text-sm text-gray-400 mt-1">전체 학생</div>
            <div className="text-xs text-gray-600 mt-1">업데이트: {lastUpdated}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {stats?.byMaterial.map(m => {
            const pct = total > 0 ? (m.count / total) * 100 : 0
            const remaining = total - m.count
            return (
              <div key={m.id} className="bg-gray-900 border border-gray-800 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">{m.name}</h2>
                  <span className="text-3xl font-bold" style={{ color: pct >= 100 ? '#4caf50' : '#90caf9' }}>
                    {Math.round(pct)}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 h-3 mb-3">
                  <div
                    className="h-3 transition-all duration-1000"
                    style={{ width: `${pct}%`, background: pct >= 100 ? '#4caf50' : '#1565c0' }}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-400 font-medium">{m.count}명 수령</span>
                  <span className="text-gray-500">{remaining}명 미수령</span>
                </div>
              </div>
            )
          })}
        </div>

        {!stats && (
          <div className="flex justify-center items-center h-64">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
