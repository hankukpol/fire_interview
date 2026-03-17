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
    const dateOnly = row.distributed_at.slice(0, 10)
    // 오늘 수령한 항목만 표시 (접수증용)
    if (dateOnly === today) {
      receipts[row.material_id] = row.distributed_at.replace('T', ' ').slice(0, 16)
    }
  }

  return NextResponse.json({ receipts })
}
