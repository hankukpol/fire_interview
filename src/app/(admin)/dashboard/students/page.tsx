'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Student } from '@/types/database'

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', exam_number:'', gender:'', region:'', series:'' })
  const [editId, setEditId] = useState<string | null>(null)
  const PAGE_SIZE = 20

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), search })
    const res = await fetch(`/api/students?${params}`)
    const data = await res.json()
    setStudents(data.students ?? [])
    setTotal(data.total ?? 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    const method = editId ? 'PATCH' : 'POST'
    const url = editId ? `/api/students/${editId}` : '/api/students'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setShowForm(false); setEditId(null); setForm({ name:'', phone:'', exam_number:'', gender:'', region:'', series:'' }); load() }
    else { const d = await res.json(); alert(d.error ?? '저장 실패') }
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' })
    if (res.ok) load()
    else alert('삭제 실패')
  }

  function startEdit(s: Student) {
    setForm({ name:s.name, phone:s.phone, exam_number:s.exam_number??'', gender:s.gender??'', region:s.region??'', series:s.series??'' })
    setEditId(s.id)
    setShowForm(true)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학생 명단 <span className="text-base text-gray-400 font-normal">({total}명)</span></h1>
        <button onClick={() => { setEditId(null); setForm({ name:'', phone:'', exam_number:'', gender:'', region:'', series:'' }); setShowForm(true) }}
          className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: 'var(--theme)' }}>
          + 학생 추가
        </button>
      </div>

      <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
        placeholder="이름, 수험번호, 연락처 검색..."
        className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm mb-4 focus:outline-none focus:border-blue-900" />

      {/* 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['이름','연락처','수험번호','직렬','지역',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">로딩 중...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">학생이 없습니다.</td></tr>
            ) : students.map(s => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.phone}</td>
                <td className="px-4 py-3 text-gray-600">{s.exam_number ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{s.series ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{s.region ?? '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(s)} className="text-xs text-blue-600 hover:underline">수정</button>
                    <button onClick={() => handleDelete(s.id)} className="text-xs text-red-500 hover:underline">삭제</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm ${p === page ? 'text-white' : 'bg-white text-gray-600 border'}`}
              style={p === page ? { background: 'var(--theme)' } : {}}>{p}</button>
          ))}
        </div>
      )}

      {/* 추가/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">{editId ? '학생 수정' : '학생 추가'}</h2>
            <div className="flex flex-col gap-3">
              {([['name','이름*'],['phone','연락처*'],['exam_number','수험번호'],['gender','성별'],['region','응시지역'],['series','직렬']] as [keyof typeof form, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 mb-1 block">{label}</label>
                  <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-900" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">취소</button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-lg text-sm text-white font-medium" style={{ background: 'var(--theme)' }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
