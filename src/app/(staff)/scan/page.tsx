'use client'

import { useState, useEffect, useRef } from 'react'

type ScanState = 'idle' | 'scanning' | 'processing' | 'selecting' | 'success' | 'error'
type TabMode = 'qr' | 'quick'

interface ScanResult {
  success: boolean
  reason?: string
  materialName?: string
  studentName?: string
  examNumber?: string
  series?: string
  distributedAt?: string
  needsSelection?: boolean
  unreceived?: { id: number; name: string }[]
}

interface Material { id: number; name: string; is_active: boolean }

export default function ScanPage() {
  const [tab, setTab] = useState<TabMode>('qr')
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [lastStudentName, setLastStudentName] = useState('')
  const scannerRef = useRef<unknown>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingTokenRef = useRef<string>('')

  // 빠른 배부
  const [materials, setMaterials] = useState<Material[]>([])
  const [quickPhone, setQuickPhone] = useState('')
  const [quickMatId, setQuickMatId] = useState<number | null>(null)
  const [quickLoading, setQuickLoading] = useState(false)
  const [quickMsg, setQuickMsg] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/materials').then(r => r.json()).then(d => {
      const active = (d.materials ?? []).filter((m: Material) => m.is_active)
      setMaterials(active)
      if (active.length > 0) setQuickMatId(active[0].id)
    })
    return () => { stopScanner() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const t = setTimeout(() => { setResult(null); setState('idle') }, state === 'success' ? 3000 : 5000)
      return () => clearTimeout(t)
    }
  }, [state])

  async function startScanner() {
    if (typeof window === 'undefined') return
    setState('scanning')
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      const containerWidth = containerRef.current?.offsetWidth ?? 300
      const boxSize = Math.min(250, containerWidth - 40)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: boxSize, height: boxSize } },
        async (decodedText: string) => { await handleScan(decodedText, scanner) },
        undefined,
      )
    } catch {
      setState('error')
      setResult({ success: false, reason: '카메라 접근 권한이 필요합니다.' })
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try { await (scannerRef.current as { stop: () => Promise<void> }).stop() } catch { /* ignore */ }
      scannerRef.current = null
    }
  }

  async function handleScan(decodedText: string, scanner: { stop: () => Promise<void> }) {
    setState('processing')
    await scanner.stop()
    scannerRef.current = null
    let token = decodedText
    try { const url = new URL(decodedText); token = url.searchParams.get('token') ?? decodedText } catch { /* not URL */ }
    pendingTokenRef.current = token
    const res = await fetch('/api/distribution/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
    const data: ScanResult = await res.json()
    setResult(data)
    if (data.studentName) setLastStudentName(data.studentName)
    if (data.needsSelection) {
      setState('selecting')
    } else {
      setState(data.success ? 'success' : 'error')
    }
  }

  async function handleSelectMaterial(materialId: number) {
    setState('processing')
    const token = pendingTokenRef.current
    const res = await fetch('/api/distribution/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, material_id: materialId }),
    })
    const data: ScanResult = await res.json()
    setResult(data)
    setState(data.success ? 'success' : 'error')
  }

  async function handleQuickDistribute() {
    if (!quickPhone.trim() || !quickMatId) return
    setQuickLoading(true)
    setQuickMsg(null)
    const res = await fetch('/api/distribution/quick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: quickPhone.replace(/\D/g, ''), material_id: quickMatId }),
    })
    const data = await res.json()
    setQuickLoading(false)
    if (res.ok) {
      setQuickMsg({ text: `✓ ${data.student_name} — ${data.material_name} 배부 완료`, ok: true })
      setQuickPhone('')
    } else {
      setQuickMsg({ text: data.error ?? '배부 실패', ok: false })
    }
    setTimeout(() => setQuickMsg(null), 4000)
  }

  const bgColors: Record<ScanState, string> = {
    idle: '#F0F2F8', scanning: '#F0F2F8', processing: '#F0F2F8', selecting: '#F0F2F8', success: '#E8F5E9', error: '#FFF3E0',
  }

  const resultTitle = () => {
    if (!result) return ''
    if (result.success) return `${result.materialName} 배부 완료`
    if (result.reason === 'ALREADY_RECEIVED') return '이미 수령한 자료입니다'
    if (result.reason === 'ALL_RECEIVED') return '모든 자료를 수령했습니다'
    if (result.reason === 'INVALID_TOKEN') return '유효하지 않은 QR 코드'
    return result.reason ?? '처리 실패'
  }

  return (
    <div className="flex flex-col items-center min-h-dvh px-5 py-6 transition-colors duration-300" style={{ background: tab === 'quick' ? '#F9FAFB' : bgColors[state] }}>

      {/* 탭 */}
      <div className="flex w-full max-w-sm mb-6 border border-gray-200 overflow-hidden">
        {(['qr', 'quick'] as TabMode[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'qr' && state !== 'idle') { stopScanner(); setState('idle') } }}
            className="flex-1 py-2.5 text-sm font-medium transition-colors"
            style={tab === t ? { background: 'var(--theme)', color: '#fff' } : { background: '#fff', color: '#6b7280' }}
          >
            {t === 'qr' ? 'QR 스캔' : '번호 입력'}
          </button>
        ))}
      </div>

      {/* ── QR 스캔 탭 ── */}
      {tab === 'qr' && (
        <>
          {(state === 'idle' || state === 'scanning') && (
            <>
              <div className="text-6xl mb-4">📷</div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme)' }}>스캔 대기 중</h1>
              {lastStudentName && (
                <div className="bg-white border border-gray-100 px-4 py-3 text-sm text-center mb-6 w-full max-w-sm">
                  <span className="text-gray-500">마지막 처리:</span>{' '}
                  <span className="font-semibold text-green-700">{lastStudentName}</span>
                </div>
              )}
              <p className="text-sm text-gray-500 mb-8 text-center">카메라로 학생의 QR 코드를 스캔해 주세요</p>
              <div id="qr-reader" ref={containerRef} className="w-full max-w-sm overflow-hidden mb-6 transition-all duration-300" style={{ minHeight: state === 'scanning' ? 300 : 4 }} />
              {state === 'idle' && (
                <button onClick={startScanner} className="w-full max-w-sm py-4 text-white font-bold text-lg" style={{ background: 'var(--theme)' }}>
                  QR 스캔 시작
                </button>
              )}
              {state === 'scanning' && (
                <button onClick={() => { stopScanner(); setState('idle') }} className="w-full max-w-sm py-4 bg-gray-200 text-gray-600 font-medium">
                  스캔 취소
                </button>
              )}
            </>
          )}

          {state === 'processing' && (
            <>
              <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-6 mt-12" />
              <p className="text-lg font-medium text-gray-700">처리 중...</p>
            </>
          )}

          {/* ── 자료 선택 화면 ── */}
          {state === 'selecting' && result && (
            <>
              <div className="w-full max-w-sm mb-5">
                <div className="bg-white border border-gray-100 p-4 mb-4">
                  {result.studentName && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">이름</span><span className="text-sm font-semibold">{result.studentName}</span></div>}
                  {result.examNumber && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">수험번호</span><span className="text-sm font-semibold">{result.examNumber}</span></div>}
                  {result.series && <div className="flex justify-between py-2"><span className="text-sm text-gray-500">직렬</span><span className="text-sm font-semibold">{result.series}</span></div>}
                </div>
                <p className="text-sm font-semibold text-gray-700 mb-3">배부할 자료를 선택하세요</p>
                <div className="flex flex-col gap-2">
                  {(result.unreceived ?? []).map(m => (
                    <button
                      key={m.id}
                      onClick={() => handleSelectMaterial(m.id)}
                      className="w-full py-3 text-white font-bold text-base"
                      style={{ background: 'var(--theme)' }}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => { setResult(null); setState('idle') }} className="w-full max-w-sm py-3 bg-gray-200 text-gray-600 font-medium text-sm">
                취소
              </button>
            </>
          )}

          {(state === 'success' || state === 'error') && result && (
            <>
              <div className="w-20 h-20 flex items-center justify-center text-white text-4xl font-bold mb-5 mt-6" style={{ background: result.success ? '#2E7D32' : '#EF6C00' }}>
                {result.success ? '✓' : '!'}
              </div>
              <h2 className="text-xl font-bold text-center mb-5 text-gray-900">{resultTitle()}</h2>
              {(result.studentName || result.materialName) && (
                <div className="bg-white border border-gray-100 p-4 w-full max-w-sm mb-6">
                  {result.studentName && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">이름</span><span className="text-sm font-semibold">{result.studentName}</span></div>}
                  {result.examNumber && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">수험번호</span><span className="text-sm font-semibold">{result.examNumber}</span></div>}
                  {result.series && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">직렬</span><span className="text-sm font-semibold">{result.series}</span></div>}
                  {result.success && result.materialName && <div className="flex justify-between py-2"><span className="text-sm text-gray-500">배부 자료</span><span className="text-sm font-semibold text-green-700">{result.materialName}</span></div>}
                </div>
              )}
              <button onClick={() => { setResult(null); startScanner() }} className="w-full max-w-sm py-4 text-white font-bold text-base" style={{ background: result.success ? '#2E7D32' : '#EF6C00' }}>
                다음 학생 스캔하기
              </button>
            </>
          )}
        </>
      )}

      {/* ── 핸드폰 번호 입력 탭 ── */}
      {tab === 'quick' && (
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-bold mb-6 text-gray-900">핸드폰 번호로 빠른 배부</h1>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">핸드폰 번호</label>
              <input
                type="tel"
                value={quickPhone}
                onChange={e => setQuickPhone(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleQuickDistribute()}
                placeholder="예: 01012345678"
                inputMode="numeric"
                className="w-full px-4 py-3 border border-gray-300 text-base focus:outline-none focus:border-blue-900"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-600 block mb-1">자료 선택</label>
              <div className="flex flex-col gap-1">
                {materials.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setQuickMatId(m.id)}
                    className="px-4 py-2.5 text-sm font-medium border text-left transition-colors"
                    style={quickMatId === m.id
                      ? { background: 'var(--theme)', color: '#fff', borderColor: 'var(--theme)' }
                      : { background: '#fff', color: '#374151', borderColor: '#d1d5db' }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleQuickDistribute}
              disabled={quickLoading || !quickPhone.trim() || !quickMatId}
              className="w-full py-3 text-white font-bold text-base disabled:opacity-50"
              style={{ background: 'var(--theme)' }}
            >
              {quickLoading ? '처리 중...' : '배부 처리'}
            </button>
            {quickMsg && (
              <p className={`text-sm text-center font-medium py-2 ${quickMsg.ok ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {quickMsg.text}
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={async () => {
          await fetch('/api/auth/staff/logout', { method: 'POST' })
          localStorage.removeItem('staff_auth_mode')
          localStorage.removeItem('staff_auth_id')
          localStorage.removeItem('staff_auth_pin')
          window.location.href = '/staff/login'
        }}
        className="mt-8 text-xs text-gray-400 underline"
      >
        이 휴대폰 인증 해제
      </button>
    </div>
  )
}
