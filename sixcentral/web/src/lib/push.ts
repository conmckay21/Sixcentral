// web/src/lib/push.ts
//
// Server-side only. Sends Expo push notifications and keeps the token table clean.
// Requires SUPABASE_SERVICE_ROLE_KEY. Never import this from a client component.

import { createClient } from '@supabase/supabase-js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const EXPO_RECEIPT_URL = 'https://exp.host/--/api/v2/push/getPushNotificationReceipts'
const BATCH_SIZE = 100

export type PushTopic = 'news' | 'weekly' | 'clips'

export type PushPayload = {
  topic: PushTopic
  title: string
  body: string
  url?: string
  articleSlug?: string
}

type ExpoTicket = {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role env vars missing')
  return createClient(url, key, { auth: { persistSession: false } })
}

const TOPIC_COLUMN: Record<PushTopic, string> = {
  news: 'topic_news',
  weekly: 'topic_weekly',
  clips: 'topic_clips',
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Send a push to everyone subscribed to a topic.
 * Safe to call more than once for the same article: the unique index on
 * (article_slug, topic) means the second call is recorded as a no-op.
 */
export async function sendPush(payload: PushPayload) {
  const db = admin()
  const column = TOPIC_COLUMN[payload.topic]

  // Claim the send first so a double publish cannot double notify.
  if (payload.articleSlug) {
    const { error: claimError } = await db.from('push_sends').insert({
      topic: payload.topic,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      article_slug: payload.articleSlug,
    })
    if (claimError) {
      // 23505 is a unique violation, meaning we already notified for this article.
      if (claimError.code === '23505') {
        return { skipped: true, reason: 'already_sent', delivered: 0, failed: 0 }
      }
      throw claimError
    }
  }

  const { data: rows, error } = await db
    .from('push_tokens')
    .select('token')
    .eq('is_active', true)
    .eq(column, true)

  if (error) throw error

  const tokens = (rows ?? [])
    .map((r: { token: string }) => r.token)
    .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'))

  if (tokens.length === 0) {
    return { skipped: false, delivered: 0, failed: 0, recipients: 0 }
  }

  let delivered = 0
  let failed = 0
  const deadTokens: string[] = []

  for (const batch of chunk(tokens, BATCH_SIZE)) {
    const messages = batch.map((to) => ({
      to,
      sound: 'default' as const,
      title: payload.title,
      body: payload.body,
      data: {
        url: payload.url ?? null,
        slug: payload.articleSlug ?? null,
        topic: payload.topic,
      },
      channelId: payload.topic,
      priority: 'high' as const,
    }))

    let tickets: ExpoTicket[] = []
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'accept-encoding': 'gzip, deflate',
        },
        body: JSON.stringify(messages),
      })
      const json = await res.json()
      tickets = Array.isArray(json?.data) ? json.data : []
    } catch (e) {
      failed += batch.length
      continue
    }

    tickets.forEach((ticket, i) => {
      if (ticket.status === 'ok') {
        delivered += 1
        return
      }
      failed += 1
      // DeviceNotRegistered means the app was uninstalled or the token rotated.
      if (ticket.details?.error === 'DeviceNotRegistered') {
        deadTokens.push(batch[i])
      }
    })
  }

  if (deadTokens.length > 0) {
    await db.from('push_tokens').update({ is_active: false }).in('token', deadTokens)
  }

  if (payload.articleSlug) {
    await db
      .from('push_sends')
      .update({ recipients: tokens.length, delivered, failed })
      .eq('article_slug', payload.articleSlug)
      .eq('topic', payload.topic)
  } else {
    await db.from('push_sends').insert({
      topic: payload.topic,
      title: payload.title,
      body: payload.body,
      url: payload.url ?? null,
      recipients: tokens.length,
      delivered,
      failed,
    })
  }

  return { skipped: false, recipients: tokens.length, delivered, failed }
}
