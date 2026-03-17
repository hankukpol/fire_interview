'use client'

import { useEffect, useState, useCallback } from 'react'

interface Log {
  id: number
  distributed_at: string
  distributed_by: string
  note: string
  students: { name: string; exam_number: string | null; series: string | null }
  materials: { name: string }
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    const res = await fetch(`/api/distribution/logs?${params}`)
    const data = await res.json()
    setLogs(data.logs ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">
        배부 로그 <span className="text-base text-gray-400 font-normal">({total}건)</span>
      </h1>

      <div className="bg-white rounded-2xl shadow-sm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['일시','학생','수험번호','직렬','자료','처리자'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">로딩 중...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">배부 기록이 없습니다.</td></tr>
            ) : logs.map(l => (
              <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {new Date(l.distributed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                </td>
                <td className="px-4 py-3 font-medium">{l.students?.name}</td>
                <td className="px-4 py-3 text-gray-600">{l.students?.exam_number ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{l.students?.series ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    {l.materials?.name}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{l.distributed_by || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm ${p === page ? 'text-white' : 'bg-white text-gray-600 border'}`}
              style={p === page ? { background: 'var(--theme)' } : {}}>{p}</button>
          ))}
        </div>
      )}
    </div>
  )
}
