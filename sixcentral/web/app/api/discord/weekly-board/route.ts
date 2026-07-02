import { createClient } from '@supabase/supabase-js';
import { findChannelId, postChannelMessage } from '@/lib/discord';

export const runtime = 'nodejs';

/** Vercel cron (Sundays 18:00 UTC): posts the weekly Come-Up board to #general. */

export async function GET(req: Request) {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('unauthorised', { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ ok: false, reason: 'no supabase env' });
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows } = await sb
    .from('leaderboard_week')
    .select('handle, respect_week')
    .limit(10);

  if (!rows || rows.length === 0) {
    return Response.json({ ok: true, posted: false, reason: 'quiet week' });
  }

  const medals = ['\u{1F947}', '\u{1F948}', '\u{1F949}'];
  const lines = rows.map(
    (r, i) =>
      `${medals[i] ?? `**${i + 1}.**`} @${r.handle} — ${Number(
        r.respect_week ?? 0,
      ).toLocaleString('en-GB')} Respect`,
  );

  const content = [
    '\u{1F4CA} **The Come-Up — this week**',
    ...lines,
    '',
    'Confirmed contributions only. Climb: https://sixcentral.co.uk/crew',
  ].join('\n');

  try {
    const channelId = await findChannelId('general');
    if (channelId) await postChannelMessage(channelId, content);
  } catch {
    return Response.json({ ok: false, reason: 'post failed' });
  }
  return Response.json({ ok: true, posted: true });
}
