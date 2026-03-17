'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function StaffLoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') ?? '/scan'
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin) { setError('PIN을 입력해 주세요.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/staff/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? '인증 실패'); return }
    router.push(redirect)
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="text-white text-center py-5 px-4" style={{ background: 'var(--theme)' }}>
        <h1 className="text-xl font-bold">직원 인증</h1>
      </div>
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 p-6">
        <p className="text-sm text-gray-600 leading-relaxed">
          인증된 직원 휴대폰에서만 QR 스캔을 처리할 수 있습니다.<br />
          처음 한 번만 PIN을 입력하면 이 브라우저에 인증이 유지됩니다.
        </p>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">직원 PIN</label>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="직원 PIN 입력"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-blue-900"
          />
        </div>
        {error && <p className="text-sm text-red-600 -mt-2">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg text-white font-medium text-base disabled:opacity-60"
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
