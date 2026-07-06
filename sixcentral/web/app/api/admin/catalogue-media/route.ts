import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Vision pass over the `media` bucket. For each image not yet catalogued, Claude
 * describes it into media_assets. Processes images in parallel waves within a
 * time budget, then chains to the next batch, so a single call gets through the
 * whole pool. Safe to re-run: catalogued images skip, and if it ever stalls,
 * running it again picks up where it left off.
 *
 *   curl -s -H "Authorization: Bearer YOUR_SECRET" https://sixcentral.co.uk/api/admin/catalogue-media
 */
const BATCH = 30;         // images attempted per invocation
const CONCURRENCY = 6;    // parallel vision calls per wave
const TIME_BUDGET_MS = 50000;
const BUCKET = 'media';
const IMAGE = /\.(jpe?g|png|webp|gif)$/i;

const SYSTEM = `You catalogue images for a GTA 6 news site image library. Look at the image and reply with ONLY a JSON object, no markdown fences and no preamble, shaped exactly like this:
{"description":"one clear sentence describing what the image shows, including location, subjects, mood and time of day","alt":"concise alt text for accessibility","tags":["6 to 10 short lowercase tags covering location, subjects, vehicles, mood, time of day and dominant colours"]}
Use UK English. If the image is a logo, interface or abstract graphic rather than a scene, say so in the description and tag it that way.`;

function mediaType(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  if (n.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function parseVision(text: string): { description: string; alt: string; tags: string[] } {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    const j = JSON.parse(clean);
    return {
      description: String(j.description ?? '').slice(0, 500),
      alt: String(j.alt ?? j.description ?? '').slice(0, 240),
      tags: Array.isArray(j.tags) ? j.tags.map((t: any) => String(t).toLowerCase()).slice(0, 12) : [],
    };
  } catch {
    return { description: clean.slice(0, 500), alt: clean.slice(0, 240), tags: [] };
  }
}

async function describe(apiKey: string, mt: string, base64: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mt, data: base64 } },
            { type: 'text', text: 'Catalogue this image.' },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('\n');
  return parseVision(text);
}

async function catalogueOne(sb: SupabaseClient, apiKey: string, name: string): Promise<void> {
  const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(name);
  if (dlErr || !blob) throw new Error(dlErr?.message || 'download failed');
  const base64 = Buffer.from(await blob.arrayBuffer()).toString('base64');
  const info = await describe(apiKey, mediaType(name), base64);
  const publicUrl = sb.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  const { error: upErr } = await sb.from('media_assets').upsert(
    {
      path: name,
      url: publicUrl,
      description: info.description,
      alt: info.alt,
      tags: info.tags,
      catalogued_at: new Date().toISOString(),
    },
    { onConflict: 'path' }
  );
  if (upErr) throw new Error(upErr.message);
}

async function listImages(sb: SupabaseClient, prefix = ''): Promise<string[]> {
  const { data } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  const out: string[] = [];
  for (const f of (data as any[]) || []) {
    const path = prefix ? `${prefix}/${f.name}` : f.name;
    if (!f.id) out.push(...(await listImages(sb, path)));
    else if (IMAGE.test(f.name)) out.push(path);
  }
  return out;
}

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 });
  if (!apiKey) return NextResponse.json({ ok: false, error: 'missing ANTHROPIC_API_KEY' }, { status: 500 });
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const images = await listImages(sb);
  const { data: done } = await sb.from('media_assets').select('path');
  const doneSet = new Set((done || []).map((d: any) => d.path as string));
  const todo = images.filter((name) => !doneSet.has(name));
  const batch = todo.slice(0, BATCH);

  const started = Date.now();
  let catalogued = 0;
  const errors: string[] = [];
  for (let i = 0; i < batch.length; i += CONCURRENCY) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    const wave = batch.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(wave.map((name) => catalogueOne(sb, apiKey, name)));
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') catalogued++;
      else errors.push(`${wave[j]}: ${String((r.reason && r.reason.message) || r.reason)}`);
    });
  }

  const remaining = todo.length - catalogued;
  const host = req.headers.get('host');
  if (host && catalogued > 0 && remaining > 0) {
    waitUntil(
      fetch(`https://${host}/api/admin/catalogue-media`, {
        headers: { authorization: req.headers.get('authorization') || '' },
      }).catch(() => {})
    );
  }

  return NextResponse.json({
    ok: true,
    total_images: images.length,
    catalogued_now: catalogued,
    remaining,
    still_running: !!host && catalogued > 0 && remaining > 0,
    errors: errors.length ? errors.slice(0, 5) : undefined,
  });
}
