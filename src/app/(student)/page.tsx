'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { normalizePhone, normalizeName } from '@/lib/utils'

export default function StudentLoginPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = normalizeName(name)
    const p = normalizePhone(phone)
    if (!n) { setError('이름을 입력해 주세요.'); return }
    if (p.length < 10) { setError('연락처를 올바르게 입력해 주세요. (숫자 10자리 이상)'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/students/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n, phone: p }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? '로그인에 실패했습니다.'); return }
      // QR 토큰을 sessionStorage에 저장 후 접수증 페이지로 이동
      sessionStorage.setItem('qr_token', data.token)
      sessionStorage.setItem('student', JSON.stringify(data.student))
      router.push('/receipt')
    } catch {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-dvh">
      {/* 헤더 */}
      <div
        className="text-white text-center py-5 px-4"
        style={{ background: 'var(--theme)' }}
      >
        <h1 className="text-xl font-bold leading-snug">
          최준 면접<br />모바일 접수증
        </h1>
      </div>

      {/* 로그인 폼 */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-5 p-6 md:rounded-2xl md:shadow-md md:mt-6"
      >
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="홍길동"
            autoComplete="name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-blue-900"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">연락처</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            placeholder="01012345678"
            autoComplete="tel"
            inputMode="numeric"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:border-blue-900"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 -mt-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg text-white font-medium text-base transition-opacity disabled:opacity-60"
          style={{ background: 'var(--theme)' }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
