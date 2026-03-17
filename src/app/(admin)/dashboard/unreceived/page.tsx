'use client'

import { useEffect, useState } from 'react'

interface Material { id: number; name: string; is_active: boolean }
interface Student { id: string; name: string; phone: string; exam_number: string | null; series: string | null; region: string | null }

export default function UnreceivedPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [selectedMat, setSelectedMat] = useState<number | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/materials').then(r => r.json()).then(d => {
      const active = (d.materials ?? []).filter((m: Material) => m.is_active)
      setMaterials(active)
      if (active.length > 0) setSelectedMat(active[0].id)
    })
  }, [])

  useEffect(() => {
    if (!selectedMat) return
    setLoading(true)
    fetch(`/api/distribution/unreceived?material_id=${selectedMat}`)
      .then(r => r.json())
      .then(d => { setStudents(d.students ?? []); setLoading(false) })
  }, [selectedMat])

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">미수령 학생 목록</h1>

      <div className="flex gap-2 mb-5 flex-wrap">
        {materials.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedMat(m.id)}
            className="px-4 py-2 text-sm font-medium border transition-colors"
            style={selectedMat === m.id
              ? { background: 'var(--theme)', color: '#fff', borderColor: 'var(--theme)' }
              : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 overflow-auto">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {materials.find(m => m.id === selectedMat)?.name} 미수령
          </span>
          <span className="text-sm text-gray-500">
            {loading ? '조회 중...' : `${students.length}명`}
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['이름','연락처','수험번호','직렬','지역'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">로딩 중...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-green-600 font-medium">전원 수령 완료!</td></tr>
            ) : students.map(s => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.phone}</td>
                <td className="px-4 py-3 text-gray-600">{s.exam_number ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{s.series ?? '-'}</td>
                <td className="px-4 py-3 text-gray-600">{s.region ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
