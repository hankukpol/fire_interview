'use client'

import { useState, useEffect, useRef } from 'react'

type ScanState = 'idle' | 'scanning' | 'processing' | 'selecting'
type TabMode = 'qr' | 'quick'

interface ScanResult {
  success: boolean
  reason?: string
  materialName?: string
  studentName?: string
  examNumber?: string
  series?: string
  needsSelection?: boolean
  unreceived?: { id: number; name: string }[]
}

interface ResultOverlay {
  success: boolean
  title: string
  studentName?: string
}

interface Material { id: number; name: string; is_active: boolean }

export default function ScanPage() {
  const [tab, setTab] = useState<TabMode>('qr')
  const [state, setState] = useState<ScanState>('idle')
  const [selectResult, setSelectResult] = useState<ScanResult | null>(null)
  const [overlay, setOverlay] = useState<ResultOverlay | null>(null)
  const [lastStudentName, setLastStudentName] = useState('')
  const scannerRef = useRef<unknown>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const pendingTokenRef = useRef<string>('')
  const isProcessingRef = useRef(false)
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    startScanner()
    return () => { stopScanner() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function startScanner() {
    if (typeof window === 'undefined') return
    if (scannerRef.current) return
    setState('scanning')
    isProcessingRef.current = false
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      const containerWidth = containerRef.current?.offsetWidth ?? 300
      const boxSize = Math.min(250, containerWidth - 40)
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: boxSize, height: boxSize } },
        async (decodedText: string) => { await handleScan(decodedText) },
        undefined,
      )
      scannerRef.current = scanner // start 성공 후에만 세팅
    } catch {
      scannerRef.current = null // 실패 시 반드시 초기화
      setState('idle')
      showOverlay({ success: false, title: '카메라 권한이 필요합니다. 브라우저 설정에서 허용해 주세요.' }, 5000)
    }
  }

  async function stopScanner() {
    if (overlayTimerRef.current) { clearTimeout(overlayTimerRef.current); overlayTimerRef.current = null }
    if (scannerRef.current) {
      try { await (scannerRef.current as { stop: () => Promise<void> }).stop() } catch { /* ignore */ }
      scannerRef.current = null
    }
    isProcessingRef.current = false
  }

  function showOverlay(o: ResultOverlay, durationMs = 2500) {
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current)
    setOverlay(o)
    overlayTimerRef.current = setTimeout(() => {
      setOverlay(null)
      isProcessingRef.current = false // 오버레이 종료 후 다음 스캔 허용
    }, durationMs)
  }

  async function handleScan(decodedText: string) {
    if (isProcessingRef.current) return // 처리 중이면 무시 (연속 인식 방지)
    isProcessingRef.current = true
    setState('processing')

    let token = decodedText
    try { const url = new URL(decodedText); token = url.searchParams.get('token') ?? decodedText } catch { /* not URL */ }
    pendingTokenRef.current = token

    try {
      const res = await fetch('/api/distribution/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data: ScanResult = await res.json()
      if (data.studentName) setLastStudentName(data.studentName)

      if (data.needsSelection) {
        setSelectResult(data)
        setState('selecting')
        return // isProcessingRef stays true until selection is made
      }

      setState('scanning') // 카메라 계속 켜진 상태로 복귀

      if (data.success) {
        showOverlay({ success: true, title: `✓  ${data.materialName} 배부 완료`, studentName: data.studentName })
      } else {
        let title = '처리 실패'
        if (data.reason === 'ALREADY_RECEIVED') title = '이미 수령한 자료입니다'
        else if (data.reason === 'ALL_RECEIVED') title = '모든 자료를 수령했습니다'
        else if (data.reason === 'INVALID_TOKEN') title = '유효하지 않은 QR 코드'
        else if (data.reason) title = data.reason
        showOverlay({ success: false, title, studentName: data.studentName }, 3000)
      }
    } catch {
      setState('scanning')
      showOverlay({ success: false, title: '네트워크 오류가 발생했습니다' }, 3000)
    }
  }

  async function handleSelectMaterial(materialId: number) {
    setState('processing')
    const token = pendingTokenRef.current
    try {
      const res = await fetch('/api/distribution/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, material_id: materialId }),
      })
      const data: ScanResult = await res.json()
      if (data.studentName) setLastStudentName(data.studentName)
      setSelectResult(null)
      setState('scanning')

      if (data.success) {
        showOverlay({ success: true, title: `✓  ${data.materialName} 배부 완료`, studentName: data.studentName })
      } else {
        showOverlay({ success: false, title: '처리 실패' })
      }
    } catch {
      setSelectResult(null)
      setState('scanning')
      showOverlay({ success: false, title: '네트워크 오류가 발생했습니다' }, 3000)
    }
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

  return (
    <div className="flex flex-col items-center min-h-dvh px-5 py-6" style={{ background: tab === 'quick' ? '#F9FAFB' : '#F0F2F8' }}>

      {/* 탭 */}
      <div className="flex w-full max-w-sm mb-5 border border-gray-200 overflow-hidden">
        {(['qr', 'quick'] as TabMode[]).map(t => (
          <button
            key={t}
            onClick={async () => {
              setTab(t)
              if (t === 'quick') { await stopScanner(); setState('idle'); setSelectResult(null); setOverlay(null) }
              if (t === 'qr') { startScanner() }
            }}
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
          {/* 마지막 처리 학생 */}
          {lastStudentName && (
            <div className="bg-white border border-gray-100 px-4 py-2.5 text-sm text-center mb-4 w-full max-w-sm">
              <span className="text-gray-400">마지막 처리:</span>{' '}
              <span className="font-semibold text-green-700">{lastStudentName}</span>
            </div>
          )}

          {/* 카메라 뷰 (항상 유지) */}
          <div className="relative w-full max-w-sm overflow-hidden mb-4">
            <div
              id="qr-reader"
              ref={containerRef}
              className="w-full"
              style={{ minHeight: state !== 'idle' ? 300 : 4 }}
            />

            {/* 처리 중 오버레이 */}
            {state === 'processing' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-14 h-14 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* 결과 오버레이 (카메라 위에 표시) */}
            {overlay && state !== 'processing' && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center px-4"
                style={{ background: overlay.success ? 'rgba(27,94,32,0.92)' : 'rgba(183,28,28,0.92)' }}
              >
                <p className="text-white text-xl font-bold text-center mb-1">{overlay.title}</p>
                {overlay.studentName && (
                  <p className="text-white/80 text-sm">{overlay.studentName}</p>
                )}
              </div>
            )}
          </div>

          {/* 자료 선택 화면 */}
          {state === 'selecting' && selectResult && (
            <div className="w-full max-w-sm">
              <div className="bg-white border border-gray-100 p-4 mb-3">
                {selectResult.studentName && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">이름</span><span className="text-sm font-semibold">{selectResult.studentName}</span></div>}
                {selectResult.examNumber && <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-sm text-gray-500">수험번호</span><span className="text-sm font-semibold">{selectResult.examNumber}</span></div>}
                {selectResult.series && <div className="flex justify-between py-2"><span className="text-sm text-gray-500">직렬</span><span className="text-sm font-semibold">{selectResult.series}</span></div>}
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-2">배부할 자료를 선택하세요</p>
              <div className="flex flex-col gap-2">
                {(selectResult.unreceived ?? []).map(m => (
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
              <button
                onClick={() => { setSelectResult(null); setState('scanning'); isProcessingRef.current = false }}
                className="w-full mt-2 py-3 bg-gray-200 text-gray-600 font-medium text-sm"
              >
                취소
              </button>
            </div>
          )}

          {/* 카메라 시작 실패 시 수동 버튼 */}
          {state === 'idle' && (
            <button onClick={startScanner} className="w-full max-w-sm py-4 text-white font-bold text-lg" style={{ background: 'var(--theme)' }}>
              QR 스캔 시작
            </button>
          )}

          {state === 'scanning' && !overlay && !selectResult && (
            <p className="text-sm text-gray-500 text-center">카메라로 학생의 QR 코드를 스캔해 주세요</p>
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
