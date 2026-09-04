// web/app/api/push/diag/route.ts
//
// Temporary. The app posts one row per step of push registration so device
// side failures are visible without a crash reporter in the binary.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const step = typeof payload.step === 'string' ? payload.step.slice(0, 64) : ''
  if (!step) return NextResponse.json({ error: 'step required' }, { status: 400 })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  await db.from('push_diag').insert({
    step,
    detail: typeof payload.detail === 'string' ? payload.detail.slice(0, 2000) : null,
    device_id: typeof payload.deviceId === 'string' ? payload.deviceId.slice(0, 128) : null,
    platform: typeof payload.platform === 'string' ? payload.platform.slice(0, 16) : null,
  })

  return NextResponse.json({ ok: true })
}
