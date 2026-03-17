import { createClient } from '@supabase/supabase-js'

// 서버 전용 service_role 클라이언트 (RLS 우회)
// 절대로 클라이언트 컴포넌트에서 import 금지
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
