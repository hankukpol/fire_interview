import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyQrToken } from '@/lib/qr/token'
import { createServerClient } from '@/lib/supabase/server'
import { verifyJwt, STAFF_COOKIE, ADMIN_COOKIE } from '@/lib/auth/jwt'

const schema = z.object({
  token: z.string().min(1),
  material_id: z.number().int().positive().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, reason: 'INVALID_INPUT' }, { status: 400 })
  }

  // 직원 레이블 추출 (미들웨어를 통과했으므로 토큰은 유효함)
  const staffCookie = req.cookies.get(STAFF_COOKIE)?.value
  const adminCookie = req.cookies.get(ADMIN_COOKIE)?.value
  const payload = staffCookie
    ? await verifyJwt(staffCookie)
    : adminCookie
      ? await verifyJwt(adminCookie)
      : null
  const actorLabel = payload?.role === 'admin' ? '관리자' : '직원 PIN 인증'

  // QR 토큰 검증
  const qrPayload = await verifyQrToken(parsed.data.token)
  if (!qrPayload) {
    return NextResponse.json({ success: false, reason: 'INVALID_TOKEN' }, { status: 400 })
  }

  const db = createServerClient()

  // 활성화된 자료 목록
  const { data: materials } = await db
    .from('materials')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  if (!materials?.length) {
    return NextResponse.json({ success: false, reason: 'NO_MATERIALS' })
  }

  // 전체 배부 이력에서 이미 받은 자료 확인
  const { data: allLogs } = await db
    .from('distribution_logs')
    .select('material_id')
    .eq('student_id', qrPayload.sid)
  const receivedIds = new Set((allLogs ?? []).map(l => l.material_id))

  const unreceived = materials.filter(m => !receivedIds.has(m.id))

  if (unreceived.length === 0) {
    return NextResponse.json({ success: false, reason: 'ALL_RECEIVED' })
  }

  // 특정 자료 지정된 경우
  if (parsed.data.material_id) {
    const targetMaterial = materials.find(m => m.id === parsed.data.material_id)
    if (!targetMaterial) {
      return NextResponse.json({ success: false, reason: 'INVALID_MATERIAL' }, { status: 400 })
    }
    if (receivedIds.has(parsed.data.material_id)) {
      return NextResponse.json({
        success: false,
        reason: 'ALREADY_RECEIVED',
        materialName: targetMaterial.name,
      })
    }
    // 지정 자료 배부
    const { data: result } = await db.rpc('distribute_material', {
      p_student_id:  qrPayload.sid,
      p_material_id: parsed.data.material_id,
      p_staff_label: actorLabel,
      p_note:        '',
    })
    if (!result?.success) {
      return NextResponse.json({ success: false, reason: result?.reason ?? 'DB_ERROR' })
    }
    const { data: student } = await db
      .from('students')
      .select('name, exam_number, series')
      .eq('id', qrPayload.sid)
      .single()
    return NextResponse.json({
      success: true,
      materialName: targetMaterial.name,
      studentName:  student?.name ?? '',
      examNumber:   student?.exam_number ?? '',
      series:       student?.series ?? '',
      distributedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    })
  }

  // 미수령 자료가 1개면 자동 배부
  if (unreceived.length === 1) {
    const nextMaterial = unreceived[0]
    const { data: result } = await db.rpc('distribute_material', {
      p_student_id:  qrPayload.sid,
      p_material_id: nextMaterial.id,
      p_staff_label: actorLabel,
      p_note:        '',
    })
    if (!result?.success) {
      return NextResponse.json({ success: false, reason: result?.reason ?? 'DB_ERROR' })
    }
    const { data: student } = await db
      .from('students')
      .select('name, exam_number, series')
      .eq('id', qrPayload.sid)
      .single()
    return NextResponse.json({
      success: true,
      materialName: nextMaterial.name,
      studentName:  student?.name ?? '',
      examNumber:   student?.exam_number ?? '',
      series:       student?.series ?? '',
      distributedAt: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
    })
  }

  // 미수령 자료가 여러 개 → 선택 필요
  const { data: student } = await db
    .from('students')
    .select('name, exam_number, series')
    .eq('id', qrPayload.sid)
    .single()

  return NextResponse.json({
    success: false,
    reason: 'NEEDS_SELECTION',
    needsSelection: true,
    unreceived,
    studentName:  student?.name ?? '',
    examNumber:   student?.exam_number ?? '',
    series:       student?.series ?? '',
  })
}
