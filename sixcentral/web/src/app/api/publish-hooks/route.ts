// web/src/app/api/publish-hooks/route.ts
//
// Called by a Postgres trigger whenever an article or guide flips to published,
// no matter how it was published: raw SQL, the publish route, or an admin UI.
//
// Env required:
//   PUBLISH_HOOK_SECRET   must match the 'publish_hook_secret' value in Supabase Vault
//   INDEXNOW_KEY          523bf5d9133a4ea3a30abfd3b5e24053
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import { NextRequest, NextResponse } from 'next/server'
import { sendPush, type PushTopic } from '@/lib/push'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SITE = 'https://sixcentral.co.uk'

type HookBody = {
  kind?: 'article' | 'guide'
  slug?: string
  title?: string
  kicker?: string | null
  excerpt?: string | null
  category?: string | null
}

async function pingIndexNow(url: string) {
  const key = process.env.INDEXNOW_KEY
  if (!key) return
  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        host: 'sixcentral.co.uk',
        key,
        keyLocation: `${SITE}/${key}.txt`,
        urlList: [url],
      }),
    })
  } catch {
    // Non-fatal. Bing will pick it up from the sitemap.
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-sixcentral-secret')
  if (!secret || secret !== process.env.PUBLISH_HOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let body: HookBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { kind, slug, title } = body
  if (!slug || !title || (kind !== 'article' && kind !== 'guide')) {
    return NextResponse.json({ error: 'kind, slug and title are required' }, { status: 400 })
  }

  const path = kind === 'guide' ? `/guides/${slug}` : `/news/${slug}`
  const url = `${SITE}${path}`

  // Always tell Bing, for both kinds.
  await pingIndexNow(url)

  // Guides are evergreen. They get indexed, not pushed.
  if (kind === 'guide') {
    return NextResponse.json({ ok: true, indexed: true, pushed: false })
  }

  // GTA Online news goes to the weekly channel, everything else to breaking news.
  const topic: PushTopic = body.category === 'online' ? 'weekly' : 'news'

  // articleSlug makes the send idempotent: the unique index on
  // (article_slug, topic) means a republish cannot notify twice.
  const result = await sendPush({
    topic,
    title: body.kicker?.trim() || 'SixCentral',
    body: title,
    url,
    articleSlug: slug,
  })

  return NextResponse.json({ ok: true, indexed: true, push: result })
}
