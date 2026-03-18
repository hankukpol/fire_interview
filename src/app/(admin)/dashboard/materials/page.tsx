'use client'

import { useEffect, useState } from 'react'
import type { Material } from '@/types/database'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', is_active: true, sort_order: 0 })
  const [editTarget, setEditTarget] = useState<Material | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', sort_order: 0 })
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

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
    if (saving) return
    setSaving(true)
    const res = await fetch('/api/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setShowForm(false); setForm({ name: '', description: '', is_active: true, sort_order: 0 }); load() }
    else { const d = await res.json(); alert(d.error ?? '추가 실패') }
  }

  function openEdit(m: Material) {
    setEditTarget(m)
    setEditForm({ name: m.name, description: m.description ?? '', sort_order: m.sort_order })
  }

  async function handleEdit() {
    if (!editTarget || saving) return
    setSaving(true)
    const res = await fetch(`/api/materials/${editTarget.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) { setEditTarget(null); load() }
    else { const d = await res.json(); alert(d.error ?? '수정 실패') }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/materials/${id}`, { method: 'DELETE' })
    if (res.ok) { setConfirmDeleteId(null); load() }
    else { setConfirmDeleteId(null); alert('삭제 실패') }
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">자료 설정</h1>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2.5 text-sm text-white font-medium" style={{ background: 'var(--theme)' }}>
          + 자료 추가
        </button>
      </div>

      <div className="bg-white border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">로딩 중...</div>
        ) : materials.length === 0 ? (
          <div className="text-center py-10 text-gray-400">자료가 없습니다.</div>
        ) : (
          <ul>
            {materials.map((m, i) => (
              <li key={m.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className="text-xs text-gray-400 w-5 shrink-0">{m.sort_order}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{m.name}</p>
                  {m.description && <p className="text-xs text-gray-400 truncate mt-0.5">{m.description}</p>}
                </div>
                <button onClick={() => toggleActive(m)}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium border transition-colors ${
                    m.is_active
                      ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
                  }`}>
                  {m.is_active ? '활성' : '비활성'}
                </button>
                <button onClick={() => openEdit(m)} className="text-xs text-blue-500 hover:text-blue-700 shrink-0">수정</button>
                {confirmDeleteId === m.id ? (
                  <span className="inline-flex items-center gap-1 shrink-0">
                    <button onClick={() => handleDelete(m.id)} className="text-xs text-red-600 font-semibold hover:underline">확인</button>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-400 hover:underline">취소</button>
                  </span>
                ) : (
                  <button onClick={() => setConfirmDeleteId(m.id)} className="text-xs text-red-400 hover:text-red-600 shrink-0">삭제</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">* 활성/비활성 버튼을 클릭하면 즉시 변경됩니다.</p>

      {editTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditTarget(null)}>
          <div className="bg-white p-6 w-full max-w-sm border border-gray-200" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">자료 수정</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">자료명*</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-blue-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">설명</label>
                <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-blue-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">정렬 순서</label>
                <input type="number" value={editForm.sort_order} onChange={e => setEditForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-blue-900" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditTarget(null)} disabled={saving} className="flex-1 py-2.5 border border-gray-300 text-sm text-gray-600 disabled:opacity-50">취소</button>
              <button onClick={handleEdit} disabled={saving} className="flex-1 py-2.5 text-sm text-white font-medium disabled:opacity-50" style={{ background: 'var(--theme)' }}>{saving ? '저장 중...' : '저장'}</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white p-6 w-full max-w-sm border border-gray-200" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">자료 추가</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">자료명*</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-blue-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">설명</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-blue-900" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">정렬 순서</label>
                <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-blue-900" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} disabled={saving} className="flex-1 py-2.5 border border-gray-300 text-sm text-gray-600 disabled:opacity-50">취소</button>
              <button onClick={handleAdd} disabled={saving} className="flex-1 py-2.5 text-sm text-white font-medium disabled:opacity-50" style={{ background: 'var(--theme)' }}>{saving ? '추가 중...' : '추가'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
