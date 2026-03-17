import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getTodayKey } from '@/lib/utils'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = createServerClient()
  const today = getTodayKey()

  const { data } = await db
    .from('distribution_logs')
    .select('material_id, distributed_at')
    .eq('student_id', id)

  // material_id → distributed_at 날짜 문자열
  const receipts: Record<number, string> = {}
  for (const row of data ?? []) {
    // UTC → KST 날짜로 비교 (오전 9시 이전 배부 버그 방지)
    const dateKST = new Date(row.distributed_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
    if (dateKST === today) {
      const timeKST = new Date(row.distributed_at).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false,
      })
      receipts[row.material_id] = timeKST
    }
  }

  return NextResponse.json({ receipts })
}
