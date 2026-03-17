'use client'

import { useState, useEffect, useRef } from 'react'

type ScanState = 'idle' | 'scanning' | 'processing' | 'success' | 'error'

interface ScanResult {
  success: boolean
  reason?: string
  materialName?: string
  studentName?: string
  examNumber?: string
  series?: string
  distributedAt?: string
}

export default function ScanPage() {
  const [state, setState] = useState<ScanState>('idle')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [lastStudentName, setLastStudentName] = useState('')
  const scannerRef = useRef<unknown>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      stopScanner()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 결과 표시 후 자동으로 대기 화면으로 복귀
  useEffect(() => {
    if (state === 'success' || state === 'error') {
      const t = setTimeout(() => {
        setResult(null)
        setState('idle')
      }, state === 'success' ? 3000 : 5000)
      return () => clearTimeout(t)
    }
  }, [state])

  async function startScanner() {
    if (typeof window === 'undefined') return
    setState('scanning')
    try {
      // html5-qrcode 동적 로드
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          await handleScan(decodedText, scanner)
        },
        undefined,
      )
    } catch {
      setState('error')
      setResult({ success: false, reason: '카메라 접근 권한이 필요합니다.' })
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current as { stop: () => Promise<void> }
        await scanner.stop()
      } catch { /* ignore */ }
      scannerRef.current = null
    }
  }

  async function handleScan(decodedText: string, scanner: { stop: () => Promise<void> }) {
    setState('processing')
    await scanner.stop()
    scannerRef.current = null

    // URL에서 token 파라미터 추출
    let token = decodedText
    try {
      const url = new URL(decodedText)
      token = url.searchParams.get('token') ?? decodedText
    } catch { /* not a URL */ }

    const res = await fetch('/api/distribution/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const data: ScanResult = await res.json()
    setResult(data)
    if (data.studentName) setLastStudentName(data.studentName)
    setState(data.success ? 'success' : 'error')
  }

  const bgColors: Record<ScanState, string> = {
    idle: '#F0F2F8',
    scanning: '#F0F2F8',
    processing: '#F0F2F8',
    success: '#E8F5E9',
    error: '#FFF3E0',
  }

  const resultTitle = () => {
    if (!result) return ''
    if (result.success) return `${result.materialName} 배부 완료`
    if (result.reason === 'ALREADY_RECEIVED_TODAY') return '오늘 이미 수령했습니다'
    if (result.reason === 'ALL_RECEIVED') return '모든 자료를 수령했습니다'
    if (result.reason === 'INVALID_TOKEN') return '유효하지 않은 QR 코드'
    return result.reason ?? '처리 실패'
  }

  return (
    <div
      className="flex flex-col items-center justify-center min-h-dvh px-5 py-8 transition-colors duration-300"
      style={{ background: bgColors[state] }}
    >
      {/* 대기 / 스캔 화면 */}
      {(state === 'idle' || state === 'scanning') && (
        <>
          <div className="text-6xl mb-4">📷</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--theme)' }}>
            스캔 대기 중
          </h1>
          {lastStudentName && (
            <div className="bg-white rounded-xl px-4 py-3 text-sm text-center mb-6 w-full max-w-sm shadow-sm">
              <span className="text-gray-500">마지막 처리:</span>{' '}
              <span className="font-semibold text-green-700">{lastStudentName}</span>
            </div>
          )}
          <p className="text-sm text-gray-500 mb-8 text-center">
            카메라로 학생의 QR 코드를 스캔해 주세요
          </p>

          {/* QR 리더 컨테이너 */}
          <div
            id="qr-reader"
            ref={containerRef}
            className="w-full max-w-sm rounded-2xl overflow-hidden mb-6"
            style={{ minHeight: state === 'scanning' ? 300 : 0 }}
          />

          {state === 'idle' && (
            <button
              onClick={startScanner}
              className="w-full max-w-sm py-4 rounded-xl text-white font-bold text-lg shadow-md"
              style={{ background: 'var(--theme)' }}
            >
              QR 스캔 시작
            </button>
          )}
          {state === 'scanning' && (
            <button
              onClick={() => { stopScanner(); setState('idle') }}
              className="w-full max-w-sm py-4 rounded-xl bg-gray-200 text-gray-600 font-medium"
            >
              스캔 취소
            </button>
          )}
        </>
      )}

      {/* 처리 중 */}
      {state === 'processing' && (
        <>
          <div className="w-16 h-16 border-4 border-blue-900 border-t-transparent rounded-full animate-spin mb-6" />
          <p className="text-lg font-medium text-gray-700">처리 중...</p>
        </>
      )}

      {/* 결과 화면 */}
      {(state === 'success' || state === 'error') && result && (
        <>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-4xl font-bold mb-5 shadow-lg"
            style={{ background: result.success ? '#2E7D32' : '#EF6C00' }}
          >
            {result.success ? '✓' : '!'}
          </div>
          <h2 className="text-xl font-bold text-center mb-5 text-gray-900">{resultTitle()}</h2>

          {(result.studentName || result.materialName) && (
            <div className="bg-white rounded-2xl p-4 w-full max-w-sm shadow-sm mb-6">
              {result.studentName && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">이름</span>
                  <span className="text-sm font-semibold">{result.studentName}</span>
                </div>
              )}
              {result.examNumber && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">수험번호</span>
                  <span className="text-sm font-semibold">{result.examNumber}</span>
                </div>
              )}
              {result.series && (
                <div className="flex justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">직렬</span>
                  <span className="text-sm font-semibold">{result.series}</span>
                </div>
              )}
              {result.success && result.materialName && (
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">배부 자료</span>
                  <span className="text-sm font-semibold text-green-700">{result.materialName}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => { setResult(null); setState('idle') }}
            className="w-full max-w-sm py-4 rounded-xl text-white font-bold text-base shadow"
            style={{ background: result.success ? '#2E7D32' : '#EF6C00' }}
          >
            다음 학생 스캔하기
          </button>
        </>
      )}

      {/* 인증 해제 버튼 */}
      <button
        onClick={async () => {
          await fetch('/api/auth/staff/logout', { method: 'POST' })
          window.location.href = '/staff/login'
        }}
        className="mt-6 text-xs text-gray-400 underline"
      >
        이 휴대폰 인증 해제
      </button>
    </div>
  )
}
