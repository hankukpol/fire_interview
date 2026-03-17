import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const page = Math.max(1, Number(sp.get('page') ?? 1))
  const limit = Math.min(100, Number(sp.get('limit') ?? 50))
  const offset = (page - 1) * limit

  const db = createServerClient()
  const { data, count, error } = await db
    .from('distribution_logs')
    .select(
      'id, distributed_at, distributed_by, note, students(name, exam_number, series), materials(name)',
      { count: 'exact' }
    )
    .order('distributed_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ logs: data ?? [], total: count ?? 0 })
}
