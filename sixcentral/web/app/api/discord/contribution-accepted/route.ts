import { createClient } from '@supabase/supabase-js';
import { findChannelId, postChannelMessage, setMemberRankRole } from '@/lib/discord';

export const runtime = 'nodejs';

/**
 * Called by the database (pg_net trigger) when a contribution flips
 * pending → accepted. Announces in #verified-log and syncs rank roles.
 * Pre-launch acceptances also grant Founding Contributor, permanently.
 */

const LAUNCH = Date.parse('2026-11-19T00:00:00Z');

export async function POST(req: Request) {
  if (req.headers.get('x-webhook-secret') !== process.env.DISCORD_WEBHOOK_SECRET) {
    return new Response('unauthorised', { status: 401 });
  }

  const payload = (await req.json()) as {
    record?: { profile_id?: string; type_key?: string; status?: string };
  };
  const rec = payload.record;
  if (!rec?.profile_id || rec.status !== 'accepted') {
    return Response.json({ ok: true, skipped: true });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ ok: false, reason: 'no service key' });
  const sb = createClient(url, key, { auth: { persistSession: false } });

  const { data: profile } = await sb
    .from('profiles')
    .select('handle, discord_id, respect, rank_id, is_staff')
    .eq('id', rec.profile_id)
    .single();
  if (!profile) return Response.json({ ok: false, reason: 'no profile' });

  const [{ data: rank }, { data: ctype }] = await Promise.all([
    sb.from('ranks').select('name').eq('id', profile.rank_id).single(),
    sb.from('contribution_types').select('label, points').eq('key', rec.type_key ?? '').maybeSingle(),
  ]);

  const who = profile.discord_id ? `<@${profile.discord_id}>` : `**@${profile.handle}**`;
  const label = ctype?.label ?? 'contribution';
  const points = ctype?.points ? `+${ctype.points} Respect` : 'Respect banked';
  const content = `✅ **Verified: ${label}** ${who} · **${points}** → ${
    rank?.name ?? ''
  } · ${profile.respect.toLocaleString('en-GB')} total`;

  try {
    const channelId = await findChannelId('verified-log');
    if (channelId) await postChannelMessage(channelId, content);
  } catch {
    /* announcement failure never blocks */
  }

  if (profile.discord_id && rank?.name && !profile.is_staff) {
    const extras = Date.now() < LAUNCH ? ['Founding Contributor'] : [];
    await setMemberRankRole(profile.discord_id, rank.name, extras).catch(() => {});
  }

  return Response.json({ ok: true });
}
