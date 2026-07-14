import type { SupabaseClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import { discordApi, verifyDiscordRequest, GUILD_ID } from '@/lib/discord';
import { HELPER_SYSTEM } from '@/lib/gtaFacts';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Discord interactions endpoint: PING, /submit, /rank, /ask, and buttons.
 *
 * Discord abandons any interaction that has not been acknowledged within
 * 3 seconds, and this route is cold on almost every invocation, so nothing
 * slow is allowed to run before the ACK. The pattern for every command and
 * button is therefore: verify the signature, acknowledge immediately with a
 * deferred ephemeral response, do the real work after the response has gone
 * out (waitUntil), then edit the result into the original message.
 */

type Option = { name: string; value?: string };
type Interaction = {
  type: number;
  token: string;
  data?: { name?: string; options?: Option[]; custom_id?: string };
  member?: { user?: { id: string } };
  user?: { id: string };
};

/** Stored verbatim as the consent record. Matches the #welcome gate message. */
const DISCORD_CONSENT =
  'The launch list (optional): pre-order intel, the launch-day checklist, and first access when the tracker goes live. Sent to the email on your SixCentral account, never shown here, unsubscribe any time.';

const EPHEMERAL = 64;
const APP_ID = '1522233114863341728';

/** Only for replies that must be produced before the deferred ACK. */
function immediate(content: string) {
  return Response.json({ type: 4, data: { content, flags: EPHEMERAL } });
}

/** Lazy so @supabase/supabase-js stays off the cold-start path. */
async function serviceClient(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('x-signature-ed25519') ?? '';
  const ts = req.headers.get('x-signature-timestamp') ?? '';
  if (!(await verifyDiscordRequest(rawBody, sig, ts))) {
    return new Response('invalid request signature', { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as Interaction;

  // Discord's liveness check
  if (interaction.type === 1) return Response.json({ type: 1 });

  const discordId = interaction.member?.user?.id ?? interaction.user?.id;
  if (!discordId) return immediate('Could not identify you. Try again.');

  const job = routeJob(interaction, discordId);
  if (!job) return immediate('Unknown command.');

  // ACK now, work after. The edit lands in the same ephemeral message.
  waitUntil(finish(interaction.token, job));
  return Response.json({ type: 5, data: { flags: EPHEMERAL } });
}

function routeJob(interaction: Interaction, discordId: string): (() => Promise<string>) | null {
  if (interaction.type === 2) {
    const command = interaction.data?.name;
    if (command === 'rank') return () => handleRank(discordId);
    if (command === 'submit') return () => handleSubmit(interaction, discordId);
    if (command === 'ask') {
      const question =
        (interaction.data?.options ?? []).find((o) => o.name === 'question')?.value ?? '';
      return () => handleAsk(question);
    }
  }

  // Button presses from the #welcome gate
  if (interaction.type === 3) {
    const button = interaction.data?.custom_id;
    if (button === 'agree_rules') return () => handleAgreeRules(discordId);
    if (button === 'newsletter_optin') return () => handleNewsletterOptin(discordId);
    if (button === 'platform_ps5') return () => handlePlatform(discordId, 'PlayStation', 'ps5-lounge');
    if (button === 'platform_xbox') return () => handlePlatform(discordId, 'Xbox', 'xbox-lounge');
  }
  return null;
}

async function finish(token: string, job: () => Promise<string>) {
  let content: string;
  try {
    content = await job();
  } catch {
    content = 'Something hiccuped. Try again in a moment.';
  }
  await editOriginal(token, content);
}

async function editOriginal(token: string, content: string) {
  await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: content.slice(0, 1900) }),
  });
}

// ---------------------------------------------------------------------------
// /ask - the AI helper, grounded hard in confirmed facts so it never repeats
// a rumour.
// ---------------------------------------------------------------------------
async function handleAsk(question: string): Promise<string> {
  try {
    return await askClaude(question);
  } catch {
    return 'The helper is briefly offline. Try again in a moment, or check https://sixcentral.co.uk';
  }
}

async function askClaude(question: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return 'The helper is not switched on yet. Ask a moderator.';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: HELPER_SYSTEM,
      messages: [{ role: 'user', content: question.slice(0, 1000) }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim();
  return text || 'I could not find a confirmed answer to that. Check https://sixcentral.co.uk for the latest.';
}

// ---------------------------------------------------------------------------
// Platform pick - grants the console role, which unlocks that lounge.
// ---------------------------------------------------------------------------
async function handlePlatform(discordId: string, roleName: string, lounge: string): Promise<string> {
  try {
    const roles = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as { id: string; name: string }[];
    const role = roles.find((r) => r.name === roleName);
    if (!role) return `The ${roleName} role is missing. Tell a moderator.`;
    await discordApi('PUT', `/guilds/${GUILD_ID}/members/${discordId}/roles/${role.id}`);
    return `${roleName} locked in \u2713 Your #${lounge} is now open. See you in there.`;
  } catch {
    return 'Something hiccuped. Try the button again in a moment.';
  }
}

async function handleAgreeRules(discordId: string): Promise<string> {
  try {
    const roles = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as { id: string; name: string }[];
    const crew = roles.find((r) => r.name === 'Crew');
    if (!crew) return 'The Crew role is missing. Tell a moderator.';
    await discordApi('PUT', `/guilds/${GUILD_ID}/members/${discordId}/roles/${crew.id}`);
    return 'Welcome to the crew \u2713 The server is open. Start in #gta6-news, pick your platform in #welcome to unlock your lounge, and if you know something worth verifying, /submit earns Respect.';
  } catch {
    return 'Something hiccuped. Try the button again in a moment.';
  }
}

async function handleNewsletterOptin(discordId: string): Promise<string> {
  const sb = await serviceClient();
  if (!sb) return 'The launch list is briefly offline. Try again shortly.';

  const { data: profile } = await sb
    .from('profiles')
    .select('id, handle')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return 'One step first: the launch list uses the email on your SixCentral account. Sign in with Discord at https://sixcentral.co.uk/account (thirty seconds, links itself), then tap this again.';
  }

  const { data: userRes } = await sb.auth.admin.getUserById(profile.id);
  const email = userRes?.user?.email?.toLowerCase();
  if (!email) return 'Could not find an email on your account. Add one at https://sixcentral.co.uk/account.';

  const { error } = await sb
    .from('subscribers')
    .insert({ email, source: 'discord', consent_text: DISCORD_CONSENT });

  if (error && error.code === '23505') {
    return 'You\u2019re already on the launch list \u2713';
  }
  if (error) return 'Could not add you just now. Try again in a moment.';
  return 'On the list \u2713 Launch-critical updates go to the email on your SixCentral account. Never shown here, unsubscribe any time.';
}

async function handleRank(discordId: string): Promise<string> {
  const sb = await serviceClient();
  if (!sb) return 'The Come-Up is briefly offline. Try again shortly.';

  const { data: profile } = await sb
    .from('profiles')
    .select('handle, respect, rank_id, title, is_staff')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return 'Your Discord is not linked to a SixCentral profile yet. Sign in with Discord at https://sixcentral.co.uk/account, it links itself, and your Respect shows up here.';
  }

  if (profile.is_staff) {
    return `**@${profile.handle}** \u00b7 **${profile.title ?? 'Staff'}** \u00b7 above the ladder.`;
  }

  const { data: ranks } = await sb.from('ranks').select('id, name, min_respect, perk').order('id');
  const rank = ranks?.find((r) => r.id === profile.rank_id);
  const next = ranks?.find((r) => r.id === profile.rank_id + 1);

  const lines = [
    `**@${profile.handle}** \u00b7 **${rank?.name ?? 'Fresh off the Bus'}**`,
    `Respect: **${profile.respect.toLocaleString('en-GB')}**`,
  ];
  if (next) {
    lines.push(
      `Next: **${next.name}** at ${next.min_respect.toLocaleString('en-GB')} (${Math.max(
        next.min_respect - profile.respect,
        0,
      ).toLocaleString('en-GB')} to go)${next.perk ? `. Unlocks: ${next.perk}` : ''}`,
    );
  } else {
    lines.push('Top of the ladder. City Legend.');
  }
  return lines.join('\n');
}

async function handleSubmit(interaction: Interaction, discordId: string): Promise<string> {
  const sb = await serviceClient();
  if (!sb) return 'Submissions are briefly offline. Try again shortly.';

  const opts = new Map((interaction.data?.options ?? []).map((o) => [o.name, o.value ?? '']));
  const typeKey = opts.get('type') === 'intel' ? 'intel' : 'verified_correction';
  const details = (opts.get('details') ?? '').trim();
  const source = (opts.get('source') ?? '').trim();
  const about = (opts.get('about') ?? '').trim();

  if (details.length < 20) {
    return 'Give the mods something to verify. A sentence or two of detail at least.';
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('id, handle')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return 'Almost there. Submissions need a linked SixCentral profile so the Respect lands somewhere. Sign in with Discord at https://sixcentral.co.uk/account (thirty seconds), then run /submit again.';
  }

  const { error } = await sb.from('contributions').insert({
    profile_id: profile.id,
    type_key: typeKey,
    status: 'pending',
    payload: { details, source: source || null, about: about || null, via: 'discord' },
  });
  if (error) return 'Could not submit. Try again in a moment.';

  const { data: ctype } = await sb
    .from('contribution_types')
    .select('points, label')
    .eq('key', typeKey)
    .single();

  return `In the queue, @${profile.handle} \u2713 A moderator will check it, and if it holds up **+${ctype?.points ?? ''} Respect** lands automatically and #verified-log announces it.`;
}
