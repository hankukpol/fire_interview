'use client'

import { useEffect, useState } from 'react'

interface Popup {
  popup_key: string
  title: string
  body: string
  is_active: boolean
}

export default function ConfigPage() {
  // ── Popup state ─────────────────────────────────────────
  const [popups, setPopups] = useState<Popup[]>([])
  const [popupLoading, setPopupLoading] = useState(false)
  const [popupMsg, setPopupMsg] = useState('')

  // ── PIN state ────────────────────────────────────────────
  const [staffPin, setStaffPin] = useState('')
  const [staffPinConfirm, setStaffPinConfirm] = useState('')
  const [adminPin, setAdminPin] = useState('')
  const [adminPinConfirm, setAdminPinConfirm] = useState('')
  const [pinMsg, setPinMsg] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  // ── Cache state ──────────────────────────────────────────
  const [cacheMsg, setCacheMsg] = useState('')
  const [cacheLoading, setCacheLoading] = useState(false)

  useEffect(() => {
    fetch('/api/config/popups')
      .then(r => r.json())
      .then(setPopups)
  }, [])

  // ── Popup save ───────────────────────────────────────────
  async function savePopup(popup: Popup) {
    setPopupLoading(true)
    setPopupMsg('')
    const res = await fetch('/api/config/popups', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(popup),
    })
    setPopupLoading(false)
    if (res.ok) {
      setPopupMsg('저장되었습니다.')
    } else {
      const d = await res.json()
      setPopupMsg(d.error ?? '저장 실패')
    }
    setTimeout(() => setPopupMsg(''), 3000)
  }

  function updatePopup(key: string, field: keyof Popup, value: string | boolean) {
    setPopups(prev => prev.map(p => p.popup_key === key ? { ...p, [field]: value } : p))
  }

  // ── PIN change ───────────────────────────────────────────
  async function changePin(role: 'staff' | 'admin') {
    const pin = role === 'staff' ? staffPin : adminPin
    const confirm = role === 'staff' ? staffPinConfirm : adminPinConfirm

    if (pin.length < 4) { setPinMsg('PIN은 4자리 이상이어야 합니다.'); return }
    if (pin !== confirm) { setPinMsg('PIN이 일치하지 않습니다.'); return }

    setPinLoading(true)
    setPinMsg('')
    const res = await fetch(`/api/auth/${role}/pin`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    setPinLoading(false)

    if (res.ok) {
      setPinMsg(`${role === 'staff' ? '직원' : '관리자'} PIN이 변경되었습니다.`)
      if (role === 'staff') { setStaffPin(''); setStaffPinConfirm('') }
      else { setAdminPin(''); setAdminPinConfirm('') }
    } else {
      const d = await res.json()
      setPinMsg(d.error ?? 'PIN 변경 실패')
    }
    setTimeout(() => setPinMsg(''), 4000)
  }

  // ── Cache invalidate ─────────────────────────────────────
  async function invalidateCache() {
    setCacheLoading(true)
    setCacheMsg('')
    const res = await fetch('/api/config/cache/invalidate', { method: 'POST' })
    setCacheLoading(false)
    if (res.ok) {
      setCacheMsg('캐시가 초기화되었습니다.')
    } else {
      setCacheMsg('캐시 초기화 실패')
    }
    setTimeout(() => setCacheMsg(''), 3000)
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const btnPrimary = 'px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50'

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>

      {/* ── 팝업 콘텐츠 ─────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800">팝업 콘텐츠</h2>

        {popups.map(popup => (
          <div key={popup.popup_key} className="space-y-3 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">{popup.title}</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-sm text-gray-500">활성</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={popup.is_active}
                    onChange={e => updatePopup(popup.popup_key, 'is_active', e.target.checked)}
                  />
                  <div
                    className={`w-10 h-6 rounded-full transition-colors ${popup.is_active ? 'bg-blue-600' : 'bg-gray-200'}`}
                    onClick={() => updatePopup(popup.popup_key, 'is_active', !popup.is_active)}
                  />
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${popup.is_active ? 'translate-x-5' : 'translate-x-1'}`}
                    onClick={() => updatePopup(popup.popup_key, 'is_active', !popup.is_active)}
                  />
                </div>
              </label>
            </div>

            <input
              type="text"
              value={popup.title}
              onChange={e => updatePopup(popup.popup_key, 'title', e.target.value)}
              placeholder="제목"
              className={inputCls}
            />
            <textarea
              value={popup.body}
              onChange={e => updatePopup(popup.popup_key, 'body', e.target.value)}
              placeholder="내용 (줄바꿈 지원)"
              rows={6}
              className={`${inputCls} resize-none`}
            />
            <button
              onClick={() => savePopup(popup)}
              disabled={popupLoading}
              className={`${btnPrimary}`}
              style={{ background: 'var(--theme)' }}
            >
              저장
            </button>
          </div>
        ))}

        {popupMsg && (
          <p className={`text-sm ${popupMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>
            {popupMsg}
          </p>
        )}
      </section>

      {/* ── PIN 변경 ─────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-800">PIN 변경</h2>

        {/* Staff PIN */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-600">직원 PIN</h3>
          <input
            type="password"
            value={staffPin}
            onChange={e => setStaffPin(e.target.value)}
            placeholder="새 PIN (4자리 이상)"
            className={inputCls}
            inputMode="numeric"
          />
          <input
            type="password"
            value={staffPinConfirm}
            onChange={e => setStaffPinConfirm(e.target.value)}
            placeholder="PIN 확인"
            className={inputCls}
            inputMode="numeric"
          />
          <button
            onClick={() => changePin('staff')}
            disabled={pinLoading}
            className={`${btnPrimary}`}
            style={{ background: 'var(--theme)' }}
          >
            직원 PIN 변경
          </button>
        </div>

        {/* Admin PIN */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-600">관리자 PIN</h3>
          <input
            type="password"
            value={adminPin}
            onChange={e => setAdminPin(e.target.value)}
            placeholder="새 PIN (4자리 이상)"
            className={inputCls}
            inputMode="numeric"
          />
          <input
            type="password"
            value={adminPinConfirm}
            onChange={e => setAdminPinConfirm(e.target.value)}
            placeholder="PIN 확인"
            className={inputCls}
            inputMode="numeric"
          />
          <button
            onClick={() => changePin('admin')}
            disabled={pinLoading}
            className={`${btnPrimary}`}
            style={{ background: 'var(--theme)' }}
          >
            관리자 PIN 변경
          </button>
        </div>

        {pinMsg && (
          <p className={`text-sm ${pinMsg.includes('실패') || pinMsg.includes('않') ? 'text-red-500' : 'text-green-600'}`}>
            {pinMsg}
          </p>
        )}
      </section>

      {/* ── 캐시 초기화 ──────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">캐시 초기화</h2>
        <p className="text-sm text-gray-500 mb-4">
          학생 목록, 자료 목록, 팝업 등 서버 캐시를 즉시 초기화합니다.
          업데이트된 데이터가 바로 반영되어야 할 때 사용하세요.
        </p>
        <button
          onClick={invalidateCache}
          disabled={cacheLoading}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {cacheLoading ? '초기화 중...' : '캐시 초기화'}
        </button>
        {cacheMsg && (
          <p className={`mt-2 text-sm ${cacheMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>
            {cacheMsg}
          </p>
        )}
      </section>
    </div>
  )
}
