export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getTodayKey } from '@/lib/utils'

async function getStats() {
  const db = createServerClient()
  const today = getTodayKey()

  const [{ count: totalStudents }, { count: totalLogs }, { count: todayLogs }, { data: materials }] =
    await Promise.all([
      db.from('students').select('*', { count: 'exact', head: true }),
      db.from('distribution_logs').select('*', { count: 'exact', head: true }),
      db.from('distribution_logs')
        .select('*', { count: 'exact', head: true })
        .gte('distributed_at', `${today}T00:00:00`),
      db.from('materials').select('id,name,is_active').order('sort_order'),
    ])

  return { totalStudents, totalLogs, todayLogs, materials: materials ?? [] }
}

export default async function DashboardPage() {
  const { totalStudents, totalLogs, todayLogs, materials } = await getStats()

  const stats = [
    { label: '전체 학생', value: totalStudents ?? 0 },
    { label: '오늘 배부', value: todayLogs ?? 0 },
    { label: '전체 배부', value: totalLogs ?? 0 },
  ]

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">대시보드</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-3xl font-bold" style={{ color: 'var(--theme)' }}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 자료 현황 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="text-base font-bold mb-4 text-gray-800">자료 현황</h2>
        <div className="flex flex-col gap-2">
          {materials.map(m => (
            <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-700">{m.name}</span>
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {m.is_active ? '활성' : '비활성'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
