'use client'

import { useEffect, useState } from 'react'
import type { Material } from '@/types/database'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', is_active: true, sort_order: 0 })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/materials?all=1')
    const data = await res.json()
    setMaterials(data.materials ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(m: Material) {
    await fetch(`/api/materials/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !m.is_active }),
    })
    load()
  }

  async function handleAdd() {
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) { setShowForm(false); setForm({ name: '', description: '', is_active: true, sort_order: 0 }); load() }
    else { const d = await res.json(); alert(d.error ?? '추가 실패') }
  }

  async function handleDelete(id: number) {
    if (!confirm('자료를 삭제하면 배부 기록도 영향을 받을 수 있습니다. 계속하시겠습니까?')) return
    const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    if (res.ok) load()
    else alert('삭제 실패')
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">자료 설정</h1>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: 'var(--theme)' }}>
          + 자료 추가
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-8 text-gray-400">로딩 중...</div>
        ) : (
          <ul>
            {materials.map((m, i) => (
              <li key={m.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                <span className="text-xs text-gray-400 w-4">{m.sort_order}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                  {m.description && <p className="text-xs text-gray-400 truncate">{m.description}</p>}
                </div>
                <button onClick={() => toggleActive(m)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    m.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}>
                  {m.is_active ? '활성' : '비활성'}
                </button>
                <button onClick={() => handleDelete(m.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">* 활성/비활성 버튼을 클릭하면 즉시 변경됩니다.</p>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">자료 추가</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">자료명*</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">설명</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">정렬 순서</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">취소</button>
              <button onClick={handleAdd} className="flex-1 py-2 rounded-lg text-sm text-white font-medium" style={{ background: 'var(--theme)' }}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
