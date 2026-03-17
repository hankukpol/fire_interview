'use client'

import { useEffect, useState, useCallback } from 'react'

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

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
  const [loadError, setLoadError] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const PAGE_SIZE = 50

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
      const res = await fetch(`/api/distribution/logs?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLogs(data.logs ?? [])
      setTotal(data.total ?? 0)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  async function handleDelete(id: number) {
    if (!confirm('이 배부 기록을 삭제하시겠습니까?')) return
    setDeletingId(id)
    await fetch(`/api/distribution/logs/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          배부 로그 <span className="text-base text-gray-400 font-normal">({total}건)</span>
        </h1>
        <a
          href="/api/distribution/logs/export"
          className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
        >
          CSV 내보내기
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['일시','학생','수험번호','직렬','자료','처리자',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">로딩 중...</td></tr>
            ) : loadError ? (
              <tr><td colSpan={7} className="text-center py-8 text-red-400">데이터를 불러오지 못했습니다. <button onClick={load} className="underline">다시 시도</button></td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">배부 기록이 없습니다.</td></tr>
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
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(l.id)}
                    disabled={deletingId === l.id}
                    className="text-xs text-red-500 hover:underline disabled:opacity-40"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-1 mt-4 flex-wrap">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="w-8 h-8 rounded-lg text-sm bg-white text-gray-600 border disabled:opacity-30">‹</button>
          {getPageNumbers(page, totalPages).map((p, i) =>
            p === '...'
              ? <span key={`e${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">…</span>
              : <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm ${p === page ? 'text-white' : 'bg-white text-gray-600 border'}`}
                  style={p === page ? { background: 'var(--theme)' } : {}}>{p}</button>
          )}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="w-8 h-8 rounded-lg text-sm bg-white text-gray-600 border disabled:opacity-30">›</button>
        </div>
      )}
    </div>
  )
}
