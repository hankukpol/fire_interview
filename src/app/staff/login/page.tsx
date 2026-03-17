'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const LS_MODE = 'staff_auth_mode'
const LS_ID   = 'staff_auth_id'
const LS_PIN  = 'staff_auth_pin'

type AuthMode = 'staff' | 'admin'

async function doAuth(authMode: AuthMode, authPin: string, authId: string) {
  if (authMode === 'admin') {
    return fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: authId, pin: authPin }),
    })
  }
  return fetch('/api/auth/staff/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin: authPin }),
  })
}

function StaffLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') ?? '/scan'

  const [mode, setMode]       = useState<AuthMode>('staff')
  const [adminId, setAdminId] = useState('')
  const [pin, setPin]         = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [autoLogging, setAutoLogging] = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [savedLabel, setSavedLabel]   = useState('')

  useEffect(() => {
    const sMode = localStorage.getItem(LS_MODE) as AuthMode | null
    const sId   = localStorage.getItem(LS_ID) ?? ''
    const sPin  = localStorage.getItem(LS_PIN) ?? ''

    if (sMode && sPin) {
      const label = sMode === 'admin'
        ? `관리자${sId ? ` (${sId})` : ''}`
        : '직원 PIN'
      setSavedLabel(label)
      setAutoLogging(true)
      doAuth(sMode, sPin, sId).then(async res => {
        if (res.ok) {
          router.replace(redirect)
        } else {
          // 저장된 인증 정보가 더 이상 유효하지 않음 (PIN 변경 등)
          localStorage.removeItem(LS_MODE)
          localStorage.removeItem(LS_ID)
          localStorage.removeItem(LS_PIN)
          setSavedLabel('')
          setAutoLogging(false)
          setShowForm(true)
          setError('저장된 인증 정보가 유효하지 않습니다. 다시 입력해 주세요.')
        }
      }).catch(() => {
        setAutoLogging(false)
        setShowForm(true)
      })
    } else {
      setShowForm(true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin) { setError('PIN을 입력해 주세요.'); return }
    setError('')
    setLoading(true)

    const res = await doAuth(mode, pin, adminId)
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? '인증 실패'); return }

    // localStorage에 인증 정보 저장 (자동 인증용)
    localStorage.setItem(LS_MODE, mode)
    localStorage.setItem(LS_PIN, pin)
    if (mode === 'admin' && adminId) {
      localStorage.setItem(LS_ID, adminId)
    } else {
      localStorage.removeItem(LS_ID)
    }

    router.push(redirect)
  }

  // 자동 인증 시도 중 화면
  if (autoLogging) {
    return (
      <div className="flex flex-col min-h-dvh items-center justify-center gap-3 px-6">
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--theme)', borderTopColor: 'transparent' }}
        />
        <p className="text-sm text-gray-500">자동 인증 중...</p>
        {savedLabel && <p className="text-xs text-gray-400">{savedLabel}</p>}
      </div>
    )
  }

  if (!showForm) return null

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="text-white text-center py-5 px-4" style={{ background: 'var(--theme)' }}>
        <h1 className="text-xl font-bold">직원 인증</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 p-6">
        <p className="text-sm text-gray-600 leading-relaxed">
          인증된 휴대폰에서만 QR 스캔을 처리할 수 있습니다.<br />
          처음 한 번 인증하면 이후 자동으로 인증됩니다.
        </p>

        {/* 인증 모드 선택 */}
        <div className="flex border border-gray-200 overflow-hidden">
          {(['staff', 'admin'] as AuthMode[]).map(m => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError('') }}
              className="flex-1 py-2.5 text-sm font-medium transition-colors"
              style={mode === m
                ? { background: 'var(--theme)', color: '#fff' }
                : { background: '#fff', color: '#6b7280' }}
            >
              {m === 'staff' ? '직원 PIN' : '관리자 인증'}
            </button>
          ))}
        </div>

        {/* 관리자 모드: ID 입력 */}
        {mode === 'admin' && (
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700">
              관리자 아이디
              <span className="text-xs text-gray-400 font-normal ml-1">(설정된 경우만 입력)</span>
            </label>
            <input
              type="text"
              value={adminId}
              onChange={e => setAdminId(e.target.value)}
              placeholder="아이디가 없으면 비워두세요"
              autoComplete="username"
              className="w-full px-4 py-3 border border-gray-300 text-base focus:outline-none focus:border-blue-900"
            />
          </div>
        )}

        {/* PIN 입력 */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">
            {mode === 'staff' ? '직원 PIN' : '관리자 PIN'}
          </label>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN 입력"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            className="w-full px-4 py-3 border border-gray-300 text-base focus:outline-none focus:border-blue-900"
          />
        </div>

        {error && <p className="text-sm text-red-600 -mt-2">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 text-white font-medium text-base disabled:opacity-60"
          style={{ background: 'var(--theme)' }}
        >
          {loading ? '인증 중...' : '이 휴대폰 인증하기'}
        </button>
      </form>
    </div>
  )
}

export default function StaffLoginPage() {
  return (
    <Suspense>
      <StaffLoginForm />
    </Suspense>
  )
}
