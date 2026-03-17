export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { getTodayKey } from '@/lib/utils'

async function getStats() {
  const db = createServerClient()
  const today = getTodayKey()

  const [
    { count: totalStudents },
    { count: totalLogs },
    { count: todayLogs },
    { data: materials },
    { data: todayDistLogs },
  ] = await Promise.all([
    db.from('students').select('*', { count: 'exact', head: true }),
    db.from('distribution_logs').select('*', { count: 'exact', head: true }),
    db.from('distribution_logs').select('*', { count: 'exact', head: true }).gte('distributed_at', `${today}T00:00:00`),
    db.from('materials').select('id,name,is_active').order('sort_order'),
    db.from('distribution_logs').select('material_id').gte('distributed_at', `${today}T00:00:00`),
  ])

  // 자료별 오늘 수령 인원 집계
  const matCountMap: Record<number, number> = {}
  for (const row of todayDistLogs ?? []) {
    matCountMap[row.material_id] = (matCountMap[row.material_id] ?? 0) + 1
  }

  return { totalStudents, totalLogs, todayLogs, materials: materials ?? [], matCountMap }
}

export default async function DashboardPage() {
  const { totalStudents, totalLogs, todayLogs, materials, matCountMap } = await getStats()
  const total = totalStudents ?? 0

  return (
    <div className="max-w-6xl mx-auto font-sans pb-10">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-0.5 bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200">F-12 대시보드</span>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">관리자 대시보드</h1>
        <p className="text-[11px] text-gray-500 mt-2 font-medium tracking-wide">2026년 3~4월 아침모의고사 / 2026-03-10 ~ 2026-05-04 / 2026-03-17 ~ 2026-03-23</p>
      </div>

      {/* Admin Memo Section Mockup (from image) */}
      <div className="bg-white border border-gray-200 mb-6 group relative shadow-sm hover:shadow-md transition-shadow">
        <div className="border-b border-gray-200 p-5 pb-4 flex justify-between items-start">
          <div>
            <h2 className="text-[10px] font-bold text-orange-500 mb-1.5 tracking-widest uppercase">Admin Memo</h2>
            <h3 className="text-lg font-bold text-gray-900 mb-1">운영 메모 포커스</h3>
            <p className="text-[11px] text-gray-500">학생 공지와 분리된 내부 메모 보드입니다. 급한 일과 공유 메모만 빠르게 확인할 수 있습니다.</p>
          </div>
          <button className="bg-slate-900 text-white text-[11px] font-medium px-4 py-2 hover:bg-slate-800 transition-colors hidden sm:block">운영 메모 열기</button>
        </div>
        
        <div className="border-b border-gray-200 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-200">
           <div className="p-5 flex flex-col justify-center">
             <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-wider">Mine</p>
             <p className="text-3xl font-bold text-gray-900">1</p>
             <p className="text-[10px] text-gray-400 mt-1">내가 담당 진행 메모</p>
           </div>
           <div className="p-5 flex flex-col justify-center">
             <p className="text-[10px] text-gray-500 font-bold uppercase mb-1 tracking-wider">Shared</p>
             <p className="text-3xl font-bold text-gray-900">0</p>
             <p className="text-[10px] text-gray-400 mt-1">공유 진행 메모</p>
           </div>
           <div className="p-5 bg-red-50/40 flex flex-col justify-center">
             <p className="text-[10px] text-red-500 font-bold uppercase mb-1 tracking-wider">Overdue</p>
             <p className="text-3xl font-bold text-gray-900">1</p>
             <p className="text-[10px] text-gray-400 mt-1">마감이 지난 메모</p>
           </div>
           <div className="p-5 bg-orange-50/40 flex flex-col justify-center">
             <p className="text-[10px] text-orange-500 font-bold uppercase mb-1 tracking-wider">Pinned</p>
             <p className="text-3xl font-bold text-gray-900">0</p>
             <p className="text-[10px] text-gray-400 mt-1">상단 고정 메모</p>
           </div>
        </div>
        <div className="p-5 sm:p-6 bg-gray-50/50">
           <div className="bg-white border border-gray-200 p-5 max-w-sm hover:border-blue-400 transition-colors cursor-pointer shadow-sm">
              <span className="inline-block px-1.5 py-0.5 bg-gray-50 text-gray-600 text-[10px] border border-gray-200 mb-3 font-medium">개인 메모</span>
              <h4 className="font-bold text-sm text-gray-900 mb-2">test</h4>
              <p className="text-xs text-gray-500 mb-4 line-clamp-1">testtesttesttesttesttesttest</p>
              <p className="text-[10px] text-gray-400">작성 한국경찰학원 · 마감 2026-03-14</p>
           </div>
        </div>
      </div>

      {/* Main Stats (Combined with user's specific real stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 border border-gray-200 p-5 relative overflow-hidden flex flex-col justify-center h-full min-h-[140px]">
           <div className="absolute top-0 left-0 w-full h-1 bg-orange-400"></div>
           <p className="text-[11px] font-bold text-gray-500 mb-2 tracking-wide">전체 학생</p>
           <div className="flex items-baseline gap-1 mt-auto">
             <p className="text-4xl font-extrabold text-orange-600 tracking-tight">{totalStudents ?? 0}</p>
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

        <div className="bg-blue-50 border border-blue-200 p-5 relative overflow-hidden md:col-span-2 h-full min-h-[140px]">
           <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
           <div className="h-full flex flex-col justify-between">
             <div>
               <p className="text-[11px] text-blue-800 font-bold mb-1 tracking-wide">오늘 배부 현황</p>
             </div>
             <div>
               <div className="flex items-baseline gap-2 mt-2">
                 <p className="text-5xl font-extrabold text-blue-700 tracking-tighter">{todayLogs ?? 0}</p>
                 <span className="text-sm font-bold text-blue-800">건</span>
               </div>
               <p className="text-[10px] text-blue-600/80 mt-2">오늘 전체 자료가 수령된 횟수</p>
             </div>
           </div>
        </div>
      </div>

      {/* 자료별 수령률 (Modified to match sharp design) */}
      <div className="bg-white border border-gray-200 mb-6">
        <div className="p-4 sm:p-5 border-b border-gray-200 flex items-center justify-between">
           <div>
             <h2 className="text-sm font-bold text-gray-900">금일 자료별 배부 현황</h2>
             <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">오늘 배부된 각 자료의 수령률을 확인합니다.</p>
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
                       <span className="w-1 h-1 bg-blue-500 inline-block rounded-full"></span>
                       {m.name}
                    </span>
                    <span className="text-[11px] flex items-center gap-2">
                      <span className="font-bold text-gray-900">{count}</span>
                      <span className="text-gray-400">/ {total}명</span>
                      <span className="ml-1 font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-sm">{pct}%</span>
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 relative overflow-hidden rounded-sm">
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
                   <span key={m.id} className="px-2 py-0.5 border border-gray-200 text-[10px] text-gray-400 bg-gray-50 rounded-sm">
                     {m.name}
                   </span>
                 ))}
               </div>
            </div>
          )}
        </div>
      </div>

      {/* 즉시 처리 필요 Mockup */}
      <div className="bg-white border border-gray-200 shadow-sm">
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
           <div>
             <h2 className="text-[13px] font-bold text-gray-900 mb-1">즉시 처리 필요</h2>
             <p className="text-[11px] text-gray-500">사유서 검토, 실패 알림 재시도, 오늘 성적 입력 진행 상황을 확인합니다.</p>
           </div>
           <div className="flex gap-1.5 shrink-0">
             <span className="px-2 py-1 border border-orange-200 text-orange-600 text-[10px] font-bold bg-white">사유서 대기 0</span>
             <span className="px-2 py-1 border border-red-200 text-red-600 text-[10px] font-bold bg-red-50">발송 실패 1</span>
             <span className="px-2 py-1 border border-blue-200 text-blue-600 text-[10px] font-bold bg-blue-50">성적 입력 3</span>
           </div>
        </div>
        <div className="p-0">
           <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div>
                <div className="flex items-center gap-2 mb-2">
                   <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-1 py-0.5 uppercase tracking-wide">성적 입력</span>
                   <span className="text-[10px] text-gray-500 font-mono">2026-03-17 00:00</span>
                </div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">공채 2주차 헌법 성적 입력 대기</h4>
                <p className="text-[11px] text-gray-500">2026-03-17 / 209(231 입력) / <span className="text-blue-600 font-bold">90.5% 완료</span></p>
              </div>
              <button className="bg-slate-900 text-white text-[11px] font-medium px-4 py-2 hover:bg-slate-800 transition-colors">성적 입력</button>
           </div>
        </div>
      </div>

    </div>
  )
}
