// web/src/app/api/push/register/route.ts
//
// The app posts here after the user grants notification permission,
// and again on every cold start so last_seen_at stays fresh.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const token = typeof payload.token === 'string' ? payload.token : ''
  const deviceId = typeof payload.deviceId === 'string' ? payload.deviceId : ''
  const platform = payload.platform === 'ios' || payload.platform === 'android' ? payload.platform : ''
  const installId = typeof payload.installId === 'string' && payload.installId.length <= 64 ? payload.installId : null

  if (!token.startsWith('ExponentPushToken')) {
    return NextResponse.json({ error: 'Invalid Expo push token' }, { status: 400 })
  }
  if (!deviceId || !platform) {
    return NextResponse.json({ error: 'deviceId and platform are required' }, { status: 400 })
  }

  const db = admin()

  // Resolve the signed-in user if the app sent a Supabase access token.
  let userId: string | null = null
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const { data } = await db.auth.getUser(auth.slice(7))
    userId = data?.user?.id ?? null
  }

  const row: Record<string, unknown> = {
    token,
    device_id: deviceId,
    platform,
    user_id: userId,
    app_version: typeof payload.appVersion === 'string' ? payload.appVersion : null,
    install_id: installId,
    is_active: true,
    last_seen_at: new Date().toISOString(),
  }

  // Topic prefs are only written when the app explicitly sends them,
  // so a cold-start refresh never resets someone's choices.
  if (typeof payload.topicNews === 'boolean') row.topic_news = payload.topicNews
  if (typeof payload.topicWeekly === 'boolean') row.topic_weekly = payload.topicWeekly
  if (typeof payload.topicClips === 'boolean') row.topic_clips = payload.topicClips

  const { error } = await db.from('push_tokens').upsert(row, { onConflict: 'token' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // One live token per install. When Expo rotates the token on the same
  // install, the old one is retired here rather than lingering until a send
  // reports it dead and the person gets the same alert twice.
  if (installId) {
    await db
      .from('push_tokens')
      .update({ is_active: false })
      .eq('install_id', installId)
      .neq('token', token)
      .eq('is_active', true)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 })

  const { error } = await admin()
    .from('push_tokens')
    .update({ is_active: false })
    .eq('token', token)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
