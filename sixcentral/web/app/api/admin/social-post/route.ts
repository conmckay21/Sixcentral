import { NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { adminClient, staffUserId } from '@/lib/draft';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// --- X (OAuth 1.0a user context) -------------------------------------------

function pct(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

interface XKeys {
  key: string;
  secret: string;
  token: string;
  tokenSecret: string;
}

function xKeys(): XKeys | null {
  const key = process.env.X_API_KEY;
  const secret = process.env.X_API_SECRET;
  const token = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_SECRET;
  if (!key || !secret || !token || !tokenSecret) return null;
  return { key, secret, token, tokenSecret };
}

function oauthHeader(method: string, url: string, k: XKeys): string {
  const oauth: Record<string, string> = {
    oauth_consumer_key: k.key,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: k.token,
    oauth_version: '1.0',
  };
  const paramStr = Object.keys(oauth)
    .sort()
    .map((key) => `${pct(key)}=${pct(oauth[key])}`)
    .join('&');
  const base = [method.toUpperCase(), pct(url), pct(paramStr)].join('&');
  const signingKey = `${pct(k.secret)}&${pct(k.tokenSecret)}`;
  const sig = createHmac('sha1', signingKey).update(base).digest('base64');
  const all: Record<string, string> = { ...oauth, oauth_signature: sig };
  return (
    'OAuth ' +
    Object.keys(all)
      .sort()
      .map((key) => `${pct(key)}="${pct(all[key])}"`)
      .join(', ')
  );
}

/** Uploads the pack image to X. Optional: failure falls back to a text post. */
async function uploadMediaToX(k: XKeys, imageUrl: string): Promise<string | null> {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.length > 4800000) return null;
    const boundary = 'sixcentral' + randomBytes(8).toString('hex');
    const head = Buffer.from(
      '--' +
        boundary +
        '\r\nContent-Disposition: form-data; name="media"; filename="image.jpg"\r\nContent-Type: application/octet-stream\r\n\r\n'
    );
    const tail = Buffer.from('\r\n--' + boundary + '--\r\n');
    const url = 'https://upload.twitter.com/1.1/media/upload.json';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        authorization: oauthHeader('POST', url, k),
        'content-type': 'multipart/form-data; boundary=' + boundary,
      },
      body: Buffer.concat([head, buf, tail]) as any,
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    return j.media_id_string || null;
  } catch {
    return null;
  }
}

async function postToX(row: any): Promise<{ url?: string }> {
  const k = xKeys();
  if (!k) {
    throw new Error(
      'X keys are not set. Add X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN and X_ACCESS_SECRET in Vercel, then redeploy.'
    );
  }
  let mediaId: string | null = null;
  if (row.platform === 'x' && row.image && row.image.url) {
    mediaId = await uploadMediaToX(k, row.image.url);
  }
  const payload: any = { text: String(row.body || '') };
  if (row.platform === 'x_poll' && Array.isArray(row.poll_options) && row.poll_options.length >= 2) {
    payload.poll = {
      options: row.poll_options.slice(0, 4).map((o: any) => String(o).slice(0, 25)),
      duration_minutes: 1440,
    };
  } else if (mediaId) {
    payload.media = { media_ids: [mediaId] };
  }
  const url = 'https://api.twitter.com/2/tweets';
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: oauthHeader('POST', url, k), 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error('x ' + res.status + ': ' + JSON.stringify(j).slice(0, 200));
  const id = j?.data?.id;
  return { url: id ? 'https://x.com/i/web/status/' + id : undefined };
}

// --- Discord ----------------------------------------------------------------

async function postToDiscord(row: any): Promise<{ url?: string }> {
  const hook = process.env.DISCORD_SOCIAL_WEBHOOK_URL;
  if (!hook) {
    throw new Error('DISCORD_SOCIAL_WEBHOOK_URL is not set. Add it in Vercel, then redeploy.');
  }
  const payload: any = { content: String(row.body || '') };
  if (row.image && row.image.url) payload.embeds = [{ image: { url: row.image.url } }];
  const res = await fetch(hook, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 204) throw new Error('discord ' + res.status);
  return {};
}

// --- Meta: Instagram and Facebook --------------------------------------------

const META = 'https://graph.facebook.com/v23.0';

async function postToInstagram(row: any): Promise<{ url?: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const igId = process.env.IG_USER_ID;
  if (!token || !igId) {
    throw new Error('Meta keys are not set. Add META_ACCESS_TOKEN and IG_USER_ID in Vercel, then redeploy.');
  }
  if (!row.image || !row.image.url) {
    throw new Error('Instagram needs an image and this pack has none. Rewrite the pack.');
  }
  let caption = String(row.body || '');
  if (Array.isArray(row.hashtags) && row.hashtags.length) {
    caption += '\n\n' + row.hashtags.map((h: string) => (h.startsWith('#') ? h : '#' + h)).join(' ');
  }
  const createRes = await fetch(`${META}/${igId}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image_url: row.image.url, caption, access_token: token }),
  });
  const created: any = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !created.id) {
    throw new Error('instagram create ' + createRes.status + ': ' + JSON.stringify(created).slice(0, 200));
  }
  // Image containers are normally ready at once; retry once if not.
  let pub: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const pubRes = await fetch(`${META}/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ creation_id: created.id, access_token: token }),
    });
    pub = await pubRes.json().catch(() => ({}));
    if (pubRes.ok && pub.id) break;
    if (attempt === 0) await new Promise((r) => setTimeout(r, 2500));
    else throw new Error('instagram publish ' + pubRes.status + ': ' + JSON.stringify(pub).slice(0, 200));
  }
  let url: string | undefined;
  try {
    const permRes = await fetch(`${META}/${pub.id}?fields=permalink&access_token=${encodeURIComponent(token)}`);
    const perm: any = await permRes.json();
    if (perm && perm.permalink) url = perm.permalink;
  } catch {
    /* permalink is optional */
  }
  return { url };
}

async function postToFacebook(row: any): Promise<{ url?: string }> {
  const token = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;
  if (!token || !pageId) {
    throw new Error('Meta keys are not set. Add META_ACCESS_TOKEN and FB_PAGE_ID in Vercel, then redeploy.');
  }
  const tokRes = await fetch(`${META}/${pageId}?fields=access_token&access_token=${encodeURIComponent(token)}`);
  const tok: any = await tokRes.json().catch(() => ({}));
  const pageToken = tok && tok.access_token;
  if (!pageToken) {
    throw new Error(
      'facebook page token ' + tokRes.status + ': check the system user has the Page assigned with manage access'
    );
  }
  let res: Response;
  if (row.image && row.image.url) {
    res = await fetch(`${META}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: row.image.url, caption: String(row.body || ''), access_token: pageToken }),
    });
  } else {
    res = await fetch(`${META}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: String(row.body || ''), access_token: pageToken }),
    });
  }
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok || !(j.id || j.post_id)) {
    throw new Error('facebook ' + res.status + ': ' + JSON.stringify(j).slice(0, 200));
  }
  const postId = j.post_id || j.id;
  return { url: 'https://www.facebook.com/' + postId };
}

// --- Route -------------------------------------------------------------------

export async function POST(req: Request) {
  const admin = adminClient();
  const staff = await staffUserId(req, admin);
  if (!staff) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  let p: { id?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  if (!p.id) return NextResponse.json({ error: 'missing id' }, { status: 400 });

  const { data: row } = await admin.from('social_posts').select('*').eq('id', p.id).maybeSingle();
  if (!row) return NextResponse.json({ error: 'post not found' }, { status: 404 });
  const r: any = row;
  if (r.posted_at) return NextResponse.json({ error: 'already posted' }, { status: 409 });

  let postUrl: string | null = null;
  try {
    if (r.platform === 'x' || r.platform === 'x_poll') {
      postUrl = (await postToX(r)).url || null;
    } else if (r.platform === 'discord') {
      await postToDiscord(r);
    } else if (r.platform === 'instagram') {
      postUrl = (await postToInstagram(r)).url || null;
    } else if (r.platform === 'facebook') {
      postUrl = (await postToFacebook(r)).url || null;
    } else {
      return NextResponse.json(
        { error: 'This platform is copy and paste by design. Post it by hand.' },
        { status: 400 }
      );
    }
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e).slice(0, 300) }, { status: 502 });
  }

  const posted_at = new Date().toISOString();
  await admin
    .from('social_posts')
    .update({ posted_at, post_url: postUrl, status: 'used', used_at: posted_at })
    .eq('id', r.id);
  return NextResponse.json({ ok: true, posted_at, post_url: postUrl });
}
