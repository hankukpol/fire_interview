import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = createServerClient()
  const { error } = await db.from('distribution_logs').delete().eq('id', Number(id))
  if (error) return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  return NextResponse.json({ success: true })
}
