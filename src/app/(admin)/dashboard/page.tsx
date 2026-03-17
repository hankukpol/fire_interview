export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getTodayKey } from '@/lib/utils'

const CHART_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]

async function getStats() {
  const db = createServerClient()
  const today = getTodayKey()

  const [
    { count: totalStudents },
    { count: totalLogs },
    { count: todayLogs },
    { data: materials },
    { data: allDistLogs },
    { data: todayLogsDetailed },
  ] = await Promise.all([
    db.from('students').select('*', { count: 'exact', head: true }),
    db.from('distribution_logs').select('*', { count: 'exact', head: true }),
    db.from('distribution_logs').select('*', { count: 'exact', head: true }).gte('distributed_at', `${today}T00:00:00`),
    db.from('materials').select('id,name,is_active').order('sort_order'),
    db.from('distribution_logs').select('material_id, student_id'),
    db.from('distribution_logs').select('distributed_at').gte('distributed_at', `${today}T00:00:00`),
  ])

  // 자료별 누적 수령 인원 집계
  const matCountMap: Record<number, number> = {}
  for (const row of allDistLogs ?? []) {
    matCountMap[row.material_id] = (matCountMap[row.material_id] ?? 0) + 1
  }

  // 전체 수령 완료 학생 수 (모든 활성 자료 수령한 학생)
  const activeMaterialIds = (materials ?? []).filter(m => m.is_active).map(m => m.id)
  const studentReceivedMap: Record<string, Set<number>> = {}
  for (const row of allDistLogs ?? []) {
    if (activeMaterialIds.includes(row.material_id)) {
      if (!studentReceivedMap[row.student_id]) studentReceivedMap[row.student_id] = new Set()
      studentReceivedMap[row.student_id].add(row.material_id)
    }
  }
  const completedCount = activeMaterialIds.length > 0
    ? Object.values(studentReceivedMap).filter(s => activeMaterialIds.every(id => s.has(id))).length
    : 0

  // 시간대별 배부 집계
  const hourMap: Record<number, number> = {}
  for (const log of todayLogsDetailed ?? []) {
    const hour = new Date(log.distributed_at).getHours()
    hourMap[hour] = (hourMap[hour] ?? 0) + 1
  }

  return { totalStudents, totalLogs, todayLogs, materials: materials ?? [], matCountMap, completedCount, hourMap }
}

export default async function DashboardPage() {
  const { totalStudents, totalLogs, todayLogs, materials, matCountMap, completedCount, hourMap } = await getStats()
  const total = totalStudents ?? 0
  const maxHourCount = Math.max(...CHART_HOURS.map(h => hourMap[h] ?? 0), 1)
  const completedPct = total > 0 ? Math.round((completedCount / total) * 100) : 0

  return (
    <div className="pb-10">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">관리자 대시보드</h1>
      </div>

      {/* 주요 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 border border-gray-200 p-5 relative overflow-hidden flex flex-col justify-center h-full min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-orange-400"></div>
          <p className="text-[11px] font-bold text-gray-500 mb-2 tracking-wide">전체 학생</p>
          <div className="flex items-baseline gap-1 mt-auto">
            <p className="text-4xl font-extrabold text-orange-600 tracking-tight">{total}</p>
            <span className="text-sm font-bold text-gray-800">명</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-2">수강중인 전체 학생수</p>
        </div>

        <div className="bg-cyan-50/30 border border-cyan-200 p-5 relative overflow-hidden flex flex-col justify-center h-full min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500"></div>
          <p className="text-[11px] font-bold text-gray-600 mb-2 tracking-wide">전체 배부</p>
          <div className="flex items-baseline gap-1 mt-auto">
            <p className="text-4xl font-extrabold text-cyan-700 tracking-tight">{totalLogs ?? 0}</p>
            <span className="text-sm font-bold text-gray-800">건</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">전체 누적 자료 배부 건수</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-5 relative overflow-hidden flex flex-col justify-center h-full min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
          <p className="text-[11px] font-bold text-blue-800 mb-2 tracking-wide">오늘 배부</p>
          <div className="flex items-baseline gap-1 mt-auto">
            <p className="text-4xl font-extrabold text-blue-700 tracking-tighter">{todayLogs ?? 0}</p>
            <span className="text-sm font-bold text-blue-800">건</span>
          </div>
          <p className="text-[10px] text-blue-600/80 mt-2">오늘 배부된 자료 수령 건수</p>
        </div>

        <div className="bg-green-50 border border-green-200 p-5 relative overflow-hidden flex flex-col justify-center h-full min-h-[140px]">
          <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
          <p className="text-[11px] font-bold text-green-800 mb-2 tracking-wide">전체 수령 완료</p>
          <div className="flex items-baseline gap-1 mt-auto">
            <p className="text-4xl font-extrabold text-green-700 tracking-tighter">{completedCount}</p>
            <span className="text-sm font-bold text-green-800">명</span>
          </div>
          <p className="text-[10px] text-green-600/80 mt-2">전체 {total}명 중 {completedPct}%</p>
        </div>
      </div>

      {/* 시간대별 배부 그래프 */}
      <div className="bg-white border border-gray-200 mb-6">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">시간대별 배부 현황</h2>
            <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">오늘 시간대별 자료 배부 건수</p>
          </div>
          <div className="text-[10px] bg-gray-50 border border-gray-200 px-2.5 py-1 text-gray-600 font-medium">
            오늘 총 {todayLogs ?? 0}건
          </div>
        </div>
        <div className="px-5 pt-5 pb-4">
          {(todayLogs ?? 0) === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">오늘 배부 기록이 없습니다.</p>
          ) : (
            <div className="flex items-end gap-1" style={{ height: '120px' }}>
              {CHART_HOURS.map(h => {
                const count = hourMap[h] ?? 0
                const pct = Math.round((count / maxHourCount) * 100)
                return (
                  <div key={h} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
                    <span className={`text-[9px] font-bold leading-none ${count > 0 ? 'text-blue-700' : 'text-transparent'}`}>
                      {count > 0 ? count : '0'}
                    </span>
                    <div className="w-full relative flex-1">
                      <div
                        className={`absolute bottom-0 left-0 right-0 ${count > 0 ? 'bg-blue-500' : 'bg-gray-100'}`}
                        style={{ height: count > 0 ? `${Math.max(pct, 6)}%` : '3px' }}
                      />
                    </div>
                    <span className="text-[8px] text-gray-400 leading-none mt-0.5">{h}시</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 자료별 수령률 */}
      <div className="bg-white border border-gray-200 mb-6">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">자료별 수령 현황</h2>
            <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">각 자료의 누적 수령 인원을 확인합니다.</p>
          </div>
          <div className="text-[10px] bg-gray-50 border border-gray-200 px-2.5 py-1 text-gray-600 font-medium">총 {materials.filter(m => m.is_active).length}개 활성 자료</div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7">
            {materials.filter(m => m.is_active).map(m => {
              const count = matCountMap[m.id] ?? 0
              const pct = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={m.id} className="group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <span className="w-1 h-1 bg-blue-500 inline-block"></span>
                      {m.name}
                    </span>
                    <span className="text-[11px] flex items-center gap-2">
                      <span className="font-bold text-gray-900">{count}</span>
                      <span className="text-gray-400">/ {total}명</span>
                      <span className="ml-1 font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5">{pct}%</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 relative overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-blue-500 transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {materials.filter(m => !m.is_active).length > 0 && (
            <div className="mt-8 pt-5 border-t border-gray-100 flex items-center gap-3 flex-wrap">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">비활성 자료</p>
              <div className="flex flex-wrap gap-1.5">
                {materials.filter(m => !m.is_active).map(m => (
                  <span key={m.id} className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 bg-gray-50">
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
