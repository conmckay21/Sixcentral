import type { SupabaseClient } from '@supabase/supabase-js';
import { discordApi, setMemberRankRole, GUILD_ID, RANK_NAMES } from '@/lib/discord';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Discord rank-role management. One secret-gated endpoint, three actions:
 *   { action: 'bootstrap' }            create/recolour the ten rank roles
 *   { action: 'sync', profile_id }     mirror one member's role to their rank
 *   { action: 'backfill' }             sync every Discord-linked member
 *
 * The ten roles are a purely cosmetic status ladder: colour and hierarchy
 * only, no permissions. setMemberRankRole (in lib/discord) does the actual
 * add-one / strip-the-other-nine work and preserves Crew and platform roles.
 */

// rank_id 0..9 -> role colour. A come-up: slate, through teal and green,
// into gold and ember, up to Kingpin pink and City Legend neon purple.
const RANK_COLOURS = [
  '6B7280', // 0 Fresh off the Bus  slate
  '2FBFB3', // 1 Corner Hustler     teal
  '1FE5D6', // 2 Getaway Driver     cyan
  '35E27C', // 3 Made Member        green
  '6EE787', // 4 Heist Crew         bright green
  'FFC83D', // 5 Lieutenant         gold
  'FF9F1C', // 6 Underboss          amber
  'FF5C39', // 7 Shot Caller        ember
  'FF2E88', // 8 Kingpin            pink
  '8A4FFF', // 9 City Legend        neon purple
];

type Role = { id: string; name: string; position: number; color: number };

function unauthorised() {
  return new Response('unauthorised', { status: 401 });
}

/** Lazy so @supabase/supabase-js stays off the cold-start path. */
async function serviceClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
}

function rankName(rankId: number): string {
  const i = Math.max(0, Math.min(RANK_NAMES.length - 1, rankId ?? 0));
  return RANK_NAMES[i];
}

export async function POST(req: Request) {
  if (req.headers.get('x-sync-secret') !== process.env.DISCORD_SYNC_SECRET) {
    return unauthorised();
  }
  if (!GUILD_ID) {
    return Response.json({ error: 'DISCORD_GUILD_ID is not set' }, { status: 500 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    profile_id?: string;
  };

  try {
    if (body.action === 'bootstrap') return Response.json(await bootstrap());
    if (body.action === 'sync') return Response.json(await syncOne(body.profile_id));
    if (body.action === 'backfill') return Response.json(await backfill());
  } catch (e) {
    return Response.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
  return Response.json({ error: 'unknown action' }, { status: 400 });
}

// ---------------------------------------------------------------------------
// bootstrap - create the ten roles if missing, keep their colours correct,
// then order the block so City Legend sits highest and Fresh off the Bus
// lowest. Re-runnable: safe to call any time to fix a colour.
// ---------------------------------------------------------------------------
async function bootstrap() {
  const existing = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as Role[];
  const byName = new Map(existing.map((r) => [r.name, r]));
  const result: { rank_id: number; name: string; id: string; created: boolean }[] = [];

  for (let i = 0; i < RANK_NAMES.length; i++) {
    const name = RANK_NAMES[i];
    const colour = parseInt(RANK_COLOURS[i], 16);
    const found = byName.get(name);
    if (found) {
      if (found.color !== colour) {
        await discordApi('PATCH', `/guilds/${GUILD_ID}/roles/${found.id}`, { color: colour });
      }
      result.push({ rank_id: i, name, id: found.id, created: false });
    } else {
      const made = (await discordApi('POST', `/guilds/${GUILD_ID}/roles`, {
        name,
        color: colour,
        hoist: false,
        mentionable: false,
        permissions: '0',
      })) as Role;
      result.push({ rank_id: i, name, id: made.id, created: true });
    }
  }

  // Order the block among itself: higher rank -> higher position. Kept within
  // the block's own footprint so roles above it (bot, admin) are undisturbed.
  try {
    const fresh = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as Role[];
    const ours = fresh.filter((r) => RANK_NAMES.includes(r.name));
    const base = Math.max(1, Math.min(...ours.map((r) => r.position)));
    const positions = result.map((r, i) => ({ id: r.id, position: base + i }));
    await discordApi('PATCH', `/guilds/${GUILD_ID}/roles`, positions);
  } catch (e) {
    return { ok: true, roles: result, ordering: `skipped: ${String(e)}` };
  }

  return { ok: true, roles: result };
}

// ---------------------------------------------------------------------------
// sync - one member. No-ops cleanly if unlinked or not in the guild.
// ---------------------------------------------------------------------------
async function syncOne(profileId?: string) {
  if (!profileId) return { skipped: 'no profile_id' };
  const sb = await serviceClient();
  if (!sb) return { error: 'supabase not configured' };

  const { data: p } = await sb
    .from('profiles')
    .select('handle, discord_id, rank_id')
    .eq('id', profileId)
    .maybeSingle();

  if (!p) return { skipped: 'profile not found' };
  if (!p.discord_id) return { skipped: 'not linked', handle: p.handle };

  const role = rankName(p.rank_id);
  await setMemberRankRole(p.discord_id, role);
  return { ok: true, handle: p.handle, rank: role };
}

// ---------------------------------------------------------------------------
// backfill - every linked member. Sequential; discordApi self-throttles on 429.
// ---------------------------------------------------------------------------
async function backfill() {
  const sb = await serviceClient();
  if (!sb) return { error: 'supabase not configured' };

  const { data: rows } = await sb
    .from('profiles')
    .select('handle, discord_id, rank_id')
    .not('discord_id', 'is', null);

  const linked = rows ?? [];
  const done: { handle: string; rank: string }[] = [];
  for (const p of linked) {
    const role = rankName(p.rank_id);
    try {
      await setMemberRankRole(p.discord_id as string, role);
      done.push({ handle: p.handle as string, rank: role });
    } catch {
      // member not in guild or transient; skip and continue
    }
  }
  return { ok: true, linked: linked.length, synced: done.length, members: done };
}
