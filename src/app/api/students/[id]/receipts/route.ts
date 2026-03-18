import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function formatKST(utcStr: string): string {
  // KST = UTC+9 (DST 없음)
  const kst = new Date(new Date(utcStr).getTime() + 9 * 60 * 60 * 1000)
  const yy = String(kst.getUTCFullYear()).slice(2)
  const mm = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(kst.getUTCDate()).padStart(2, '0')
  const dow = DAYS[kst.getUTCDay()]
  const hh = String(kst.getUTCHours()).padStart(2, '0')
  const min = String(kst.getUTCMinutes()).padStart(2, '0')
  return `${yy}.${mm}.${dd}(${dow}) ${hh}:${min}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const db = createServerClient()

  const { data } = await db
    .from('distribution_logs')
    .select('material_id, distributed_at')
    .eq('student_id', id)

  const receipts: Record<number, string> = {}
  for (const row of data ?? []) {
    receipts[row.material_id] = formatKST(row.distributed_at)
  }

  return NextResponse.json({ receipts })
}
