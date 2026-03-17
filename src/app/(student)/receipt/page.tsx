'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import type { Student, Material } from '@/types/database'

interface ReceiptData {
  student: Student
  materials: Material[]
  receipts: Record<number, string>   // material_id → distributed_at
  token: string
  popups: { notice: { title: string; body: string; active: boolean }; refund: { title: string; body: string } }
}

export default function ReceiptPage() {
  const router = useRouter()
  const [data, setData] = useState<ReceiptData | null>(null)
  const [modal, setModal] = useState<'notice' | 'refund' | null>(null)
  const [dateStr, setDateStr] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('qr_token')
    const studentRaw = sessionStorage.getItem('student')
    if (!token || !studentRaw) { router.replace('/'); return }

    const student = JSON.parse(studentRaw) as Student
    // 자료 목록 + 수령 현황 + 팝업 로드
    Promise.all([
      fetch('/api/materials').then(r => r.json()),
      fetch(`/api/students/${student.id}/receipts`).then(r => r.json()),
      fetch(`/api/config/popups`).then(r => r.json()),
    ]).then(([mats, rec, popArr]) => {
      const arr = Array.isArray(popArr) ? popArr : []
      const noticeRow = arr.find((p: { popup_key: string }) => p.popup_key === 'notice')
      const refundRow = arr.find((p: { popup_key: string }) => p.popup_key === 'refund_policy')
      const popups = {
        notice: { title: noticeRow?.title ?? '공지사항', body: noticeRow?.body ?? '', active: noticeRow?.is_active ?? false },
        refund: { title: refundRow?.title ?? '환불규정', body: refundRow?.body ?? '' },
      }
      setData({ student, materials: mats.materials ?? [], receipts: rec.receipts ?? {}, token, popups })
    })

    // 날짜 표시 타이머
    const updateDate = () => {
      const days = ['일','월','화','수','목','금','토']
      const n = new Date()
      const y = n.getFullYear(), m = String(n.getMonth()+1).padStart(2,'0'), d = String(n.getDate()).padStart(2,'0')
      setDateStr(`${y}-${m}-${d} (${days[n.getDay()]})`)
    }
    updateDate()
    timerRef.current = setInterval(updateDate, 60000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [router])

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { student, materials, receipts, token } = data
  const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/scan?token=${encodeURIComponent(token)}`

  // 다음 수령 대상
  const nextMaterialId = materials.find(m => m.is_active && !receipts[m.id])?.id

  return (
    <div className="flex flex-col min-h-dvh">
      {/* 헤더 */}
      <div className="text-white text-center py-5 px-4" style={{ background: 'var(--theme)' }}>
        <h1 className="text-xl font-bold">최준 면접 모바일 접수증</h1>
        <p className="text-sm mt-1 text-white/80">{dateStr}</p>
      </div>

      {/* 학생 정보 */}
      <section className="p-4 border-t border-gray-100">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--theme)' }}>학생 정보</h2>
        <table className="w-full text-sm">
          <tbody>
            {[
              ['이름', student.name],
              ['수험번호', student.exam_number ?? '-'],
              ['성별', student.gender ?? '-'],
              ['응시지역', student.region ?? '-'],
              ['직렬', student.series ?? '-'],
            ].map(([k, v]) => (
              <tr key={k} className="border-b border-gray-50 last:border-0">
                <td className="py-2 pr-4 text-gray-500 w-24">{k}</td>
                <td className="py-2 font-medium text-gray-900">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* 자료 수령 현황 */}
      <section className="p-4 border-t border-gray-100">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--theme)' }}>자료 수령 현황</h2>
        <ul className="flex flex-col gap-1">
          {materials.filter(m => m.is_active).map(m => {
            const received = !!receipts[m.id]
            const isNext = m.id === nextMaterialId
            return (
              <li
                key={m.id}
                className={`flex items-center gap-3 py-2 px-2 rounded-lg ${isNext ? 'bg-blue-50' : ''}`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    received ? 'bg-green-700 text-white' : 'border-2 border-gray-300'
                  }`}
                >
                  {received && '✓'}
                </span>
                <span className={`text-sm font-medium ${isNext ? 'text-blue-900 underline font-bold' : 'text-gray-700'}`}>
                  {m.name}
                </span>
                <span className="text-xs ml-auto">
                  {received
                    ? <span className="text-green-700">{receipts[m.id]}</span>
                    : isNext
                      ? <span className="text-gray-400">미수령 ← 다음</span>
                      : <span className="text-gray-300">미수령</span>
                  }
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* QR 코드 */}
      <section className="p-4 border-t border-gray-100 text-center">
        <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--theme)' }}>개인 QR 코드</h2>
        <div className="inline-block p-3 border-2 border-gray-100 rounded-xl mb-2">
          <QRCodeSVG value={qrUrl} size={220} level="M" />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--theme)' }}>
          인증된 직원 휴대폰으로 QR을 스캔해 주세요
        </p>
      </section>

      {/* 팝업 버튼 */}
      <div className="flex gap-3 px-4 pb-2">
        {data.popups?.notice?.active && (
          <button
            onClick={() => setModal('notice')}
            className="flex-1 py-3 rounded-lg text-sm font-medium"
            style={{ background: '#e8eaf6', color: 'var(--theme)' }}
          >
            공지사항
          </button>
        )}
        <button
          onClick={() => setModal('refund')}
          className="flex-1 py-3 rounded-lg text-sm font-medium"
          style={{ background: '#e8eaf6', color: 'var(--theme)' }}
        >
          환불규정
        </button>
      </div>
      <div className="px-4 pb-6">
        <button
          onClick={() => { sessionStorage.clear(); router.push('/') }}
          className="w-full py-3 rounded-lg text-sm text-gray-500 border border-gray-200"
        >
          처음으로
        </button>
      </div>

      {/* 팝업 모달 */}
      {modal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white rounded-t-2xl w-full max-w-[768px] max-h-[75vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <span className="text-base font-bold" style={{ color: 'var(--theme)' }}>
                {modal === 'notice' ? data.popups.notice.title : data.popups.refund.title}
              </span>
              <button onClick={() => setModal(null)} className="text-gray-400 text-xl p-1">✕</button>
            </div>
            <div className="p-5 overflow-y-auto text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {modal === 'notice' ? data.popups.notice.body : data.popups.refund.body}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
