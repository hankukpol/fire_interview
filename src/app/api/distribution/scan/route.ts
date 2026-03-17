import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyQrToken } from '@/lib/qr/token'
import { createServerClient } from '@/lib/supabase/server'
import { verifyJwt, STAFF_COOKIE, ADMIN_COOKIE } from '@/lib/auth/jwt'

const schema = z.object({ token: z.string().min(1) })

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

  // 다음 배부할 자료 결정
  const { data: materials } = await db
    .from('materials')
    .select('id, name')
    .eq('is_active', true)
    .order('sort_order')

  if (!materials?.length) {
    return NextResponse.json({ success: false, reason: 'NO_MATERIALS' })
  }

  // 오늘(한국 시간 기준) 이미 배부된 자료 확인
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const { data: todayLogs } = await db
    .from('distribution_logs')
    .select('material_id')
    .eq('student_id', qrPayload.sid)
    .gte('distributed_at', `${today}T00:00:00+09:00`)
    .lte('distributed_at', `${today}T23:59:59.999+09:00`)

  const todayMaterialIds = new Set((todayLogs ?? []).map(l => l.material_id))

  // 오늘 이미 1회라도 수령한 경우 차단 (1일 1회 제한)
  if (todayMaterialIds.size > 0) {
    const mat = materials.find(m => todayMaterialIds.has(m.id))
    return NextResponse.json({
      success: false,
      reason: 'ALREADY_RECEIVED_TODAY',
      materialName: mat?.name ?? '자료',
    })
  }

  // 전체 배부 이력에서 아직 받지 않은 다음 자료 찾기
  const { data: allLogs } = await db
    .from('distribution_logs')
    .select('material_id')
    .eq('student_id', qrPayload.sid)
  const receivedIds = new Set((allLogs ?? []).map(l => l.material_id))

  const nextMaterial = materials.find(m => !receivedIds.has(m.id))
  if (!nextMaterial) {
    return NextResponse.json({ success: false, reason: 'ALL_RECEIVED' })
  }

  // DB 함수로 원자적 배부 처리
  const { data: result } = await db.rpc('distribute_material', {
    p_student_id:  qrPayload.sid,
    p_material_id: nextMaterial.id,
    p_staff_label: actorLabel,
    p_note:        '',
  })

  if (!result?.success) {
    return NextResponse.json({ success: false, reason: result?.reason ?? 'DB_ERROR' })
  }

  // 학생 정보 조회
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
