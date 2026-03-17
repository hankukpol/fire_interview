'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin) { setError('PIN을 입력해 주세요.'); return }
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? '인증 실패'); return }
    router.push('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-dvh bg-gray-50">
      <div className="flex items-center justify-center flex-1">
        <div className="bg-white rounded-2xl shadow-md p-8 w-full max-w-sm">
          <h1 className="text-xl font-bold text-center mb-6" style={{ color: 'var(--theme)' }}>
            관리자 로그인
          </h1>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">관리자 PIN</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="관리자 PIN"
                inputMode="numeric"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-blue-900"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-medium text-base disabled:opacity-60"
              style={{ background: 'var(--theme)' }}
            >
              {loading ? '인증 중...' : '로그인'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
