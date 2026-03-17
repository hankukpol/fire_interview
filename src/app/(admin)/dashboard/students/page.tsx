'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Student } from '@/types/database'

const SERIES_COLS = ['공채', '구급', '학과', '구조', '기타']

function parseExcelPaste(text: string): { name: string; phone: string; exam_number: string; gender: string; region: string; series: string }[] {
  return text.trim().split('\n').flatMap(line => {
    const cols = line.split('\t').map(c => c.trim())
    const name = cols[0] ?? ''
    const phone = cols[1] ?? ''
    if (!name || !phone) return []
    const exam_number = cols[3] ?? ''
    const gender = cols[4] ?? ''
    const region = cols[5] ?? ''
    // 직렬: col 6~10 중 'O'/'o' 있는 컬럼명
    const seriesIdx = SERIES_COLS.findIndex((_, i) => /^o$/i.test(cols[6 + i] ?? ''))
    const series = seriesIdx >= 0 ? SERIES_COLS[seriesIdx] : ''
    return [{ name, phone, exam_number, gender, region, series }]
  })
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name:'', phone:'', exam_number:'', gender:'', region:'', series:'' })
  const [editId, setEditId] = useState<string | null>(null)

  // 엑셀 붙여넣기
  const [showBulk, setShowBulk] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState<ReturnType<typeof parseExcelPaste>>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkMsg, setBulkMsg] = useState('')

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

  function handlePasteChange(text: string) {
    setPasteText(text)
    setBulkMsg('')
    setPreview(text.trim() ? parseExcelPaste(text) : [])
  }

  async function handleBulkImport() {
    if (!preview.length) return
    setBulkLoading(true)
    setBulkMsg('')
    const res = await fetch('/api/students/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preview),
    })
    const data = await res.json()
    setBulkLoading(false)
    if (!res.ok) { setBulkMsg(data.error ?? '등록 실패'); return }
    setBulkMsg(`완료: ${data.inserted}명 등록 (전체 ${data.total}명 중 중복 제외)`)
    load()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">학생 명단 <span className="text-base text-gray-400 font-normal">({total}명)</span></h1>
        <div className="flex gap-2">
          <button onClick={() => { setPasteText(''); setPreview([]); setBulkMsg(''); setShowBulk(true) }}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 bg-white">
            엑셀 붙여넣기
          </button>
          <button onClick={() => { setEditId(null); setForm({ name:'', phone:'', exam_number:'', gender:'', region:'', series:'' }); setShowForm(true) }}
            className="px-4 py-2 rounded-lg text-sm text-white font-medium" style={{ background: 'var(--theme)' }}>
            + 학생 추가
          </button>
        </div>
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

      {/* 엑셀 붙여넣기 모달 */}
      {showBulk && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBulk(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1">엑셀 붙여넣기 대량 등록</h2>
            <p className="text-xs text-gray-500 mb-3">
              엑셀에서 데이터 행을 선택 후 복사(Ctrl+C)하여 아래에 붙여넣기(Ctrl+V)하세요.<br />
              컬럼 순서: <strong>이름 / 연락처 / 구분 / 수험번호 / 성별 / 응시지역 / 공채 / 구급 / 학과 / 구조 / 기타</strong>
            </p>
            <textarea
              className="w-full h-32 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-900 resize-none"
              placeholder="여기에 엑셀 데이터를 붙여넣으세요..."
              value={pasteText}
              onChange={e => handlePasteChange(e.target.value)}
            />

            {preview.length > 0 && (
              <div className="mt-3 flex-1 overflow-auto">
                <p className="text-xs text-gray-500 mb-1">미리보기 ({preview.length}명)</p>
                <table className="w-full text-xs border border-gray-100 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50">
                    <tr>
                      {['이름','연락처','수험번호','성별','지역','직렬'].map(h => (
                        <th key={h} className="px-2 py-2 text-left text-gray-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t border-gray-50">
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1">{r.phone}</td>
                        <td className="px-2 py-1">{r.exam_number || '-'}</td>
                        <td className="px-2 py-1">{r.gender || '-'}</td>
                        <td className="px-2 py-1">{r.region || '-'}</td>
                        <td className="px-2 py-1">{r.series || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bulkMsg && (
              <p className={`mt-2 text-sm ${bulkMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>{bulkMsg}</p>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowBulk(false)} className="flex-1 py-2 rounded-lg border text-sm text-gray-600">닫기</button>
              <button
                onClick={handleBulkImport}
                disabled={bulkLoading || preview.length === 0}
                className="flex-1 py-2 rounded-lg text-sm text-white font-medium disabled:opacity-50"
                style={{ background: 'var(--theme)' }}
              >
                {bulkLoading ? '등록 중...' : `${preview.length}명 등록`}
              </button>
            </div>
          </div>
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
