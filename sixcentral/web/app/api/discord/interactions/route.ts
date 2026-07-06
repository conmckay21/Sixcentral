import { createClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import { discordApi, verifyDiscordRequest, GUILD_ID } from '@/lib/discord';
import { HELPER_SYSTEM } from '@/lib/gtaFacts';

export const runtime = 'nodejs';

/** Discord interactions endpoint: PING, /submit, /rank, /ask, and buttons. */

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

function reply(content: string) {
  return Response.json({ type: 4, data: { content, flags: EPHEMERAL } });
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
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
  if (!discordId) return reply('Could not identify you. Try again.');

  if (interaction.type === 2) {
    const command = interaction.data?.name;
    if (command === 'rank') return handleRank(discordId);
    if (command === 'submit') return handleSubmit(interaction, discordId);
    if (command === 'ask') return handleAsk(interaction);
  }

  // Button presses from the #welcome gate
  if (interaction.type === 3) {
    const button = interaction.data?.custom_id;
    if (button === 'agree_rules') return handleAgreeRules(discordId);
    if (button === 'newsletter_optin') return handleNewsletterOptin(discordId);
    if (button === 'platform_ps5') return handlePlatform(discordId, 'PlayStation', 'ps5-lounge');
    if (button === 'platform_xbox') return handlePlatform(discordId, 'Xbox', 'xbox-lounge');
  }

  return reply('Unknown command.');
}

// ---------------------------------------------------------------------------
// /ask - the AI helper. Deferred so the model has time to answer; the real
// reply is edited in by answerAsk once the model returns. Grounded hard in
// confirmed facts so it never repeats a rumour.
// ---------------------------------------------------------------------------
function handleAsk(interaction: Interaction) {
  const question = (interaction.data?.options ?? []).find((o) => o.name === 'question')?.value ?? '';
  waitUntil(answerAsk(interaction.token, question));
  return Response.json({ type: 5, data: { flags: EPHEMERAL } }); // deferred, ephemeral
}

async function answerAsk(token: string, question: string) {
  let answer: string;
  try {
    answer = await askClaude(question);
  } catch {
    answer = 'The helper is briefly offline. Try again in a moment, or check https://sixcentral.co.uk';
  }
  await editOriginal(token, answer);
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

async function editOriginal(token: string, content: string) {
  await fetch(`https://discord.com/api/v10/webhooks/${APP_ID}/${token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: content.slice(0, 1900) }),
  });
}

// ---------------------------------------------------------------------------
// Platform pick - grants the console role, which unlocks that lounge.
// ---------------------------------------------------------------------------
async function handlePlatform(discordId: string, roleName: string, lounge: string) {
  try {
    const roles = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as { id: string; name: string }[];
    const role = roles.find((r) => r.name === roleName);
    if (!role) return reply(`The ${roleName} role is missing. Tell a moderator.`);
    await discordApi('PUT', `/guilds/${GUILD_ID}/members/${discordId}/roles/${role.id}`);
    return reply(`${roleName} locked in \u2713 Your #${lounge} is now open. See you in there.`);
  } catch {
    return reply('Something hiccuped. Try the button again in a moment.');
  }
}

async function handleAgreeRules(discordId: string) {
  try {
    const roles = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as { id: string; name: string }[];
    const crew = roles.find((r) => r.name === 'Crew');
    if (!crew) return reply('The Crew role is missing. Tell a moderator.');
    await discordApi('PUT', `/guilds/${GUILD_ID}/members/${discordId}/roles/${crew.id}`);
    return reply(
      'Welcome to the crew \u2713 The server is open. Start in #gta6-news, pick your platform in #welcome to unlock your lounge, and if you know something worth verifying, /submit earns Respect.',
    );
  } catch {
    return reply('Something hiccuped. Try the button again in a moment.');
  }
}

async function handleNewsletterOptin(discordId: string) {
  const sb = serviceClient();
  if (!sb) return reply('The launch list is briefly offline. Try again shortly.');

  const { data: profile } = await sb
    .from('profiles')
    .select('id, handle')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return reply(
      'One step first: the launch list uses the email on your SixCentral account. Sign in with Discord at https://sixcentral.co.uk/account (thirty seconds, links itself), then tap this again.',
    );
  }

  const { data: userRes } = await sb.auth.admin.getUserById(profile.id);
  const email = userRes?.user?.email?.toLowerCase();
  if (!email) return reply('Could not find an email on your account. Add one at https://sixcentral.co.uk/account.');

  const { error } = await sb
    .from('subscribers')
    .insert({ email, source: 'discord', consent_text: DISCORD_CONSENT });

  if (error && error.code === '23505') {
    return reply('You\u2019re already on the launch list \u2713');
  }
  if (error) return reply('Could not add you just now. Try again in a moment.');
  return reply(
    'On the list \u2713 Launch-critical updates go to the email on your SixCentral account. Never shown here, unsubscribe any time.',
  );
}

async function handleRank(discordId: string) {
  const sb = serviceClient();
  if (!sb) return reply('The Come-Up is briefly offline. Try again shortly.');

  const { data: profile } = await sb
    .from('profiles')
    .select('handle, respect, rank_id, title, is_staff')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return reply(
      'Your Discord is not linked to a SixCentral profile yet. Sign in with Discord at https://sixcentral.co.uk/account, it links itself, and your Respect shows up here.',
    );
  }

  if (profile.is_staff) {
    return reply(`**@${profile.handle}** \u00b7 **${profile.title ?? 'Staff'}** \u00b7 above the ladder.`);
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
  return reply(lines.join('\n'));
}

async function handleSubmit(interaction: Interaction, discordId: string) {
  const sb = serviceClient();
  if (!sb) return reply('Submissions are briefly offline. Try again shortly.');

  const opts = new Map((interaction.data?.options ?? []).map((o) => [o.name, o.value ?? '']));
  const typeKey = opts.get('type') === 'intel' ? 'intel' : 'verified_correction';
  const details = (opts.get('details') ?? '').trim();
  const source = (opts.get('source') ?? '').trim();
  const about = (opts.get('about') ?? '').trim();

  if (details.length < 20) {
    return reply('Give the mods something to verify. A sentence or two of detail at least.');
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('id, handle')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return reply(
      'Almost there. Submissions need a linked SixCentral profile so the Respect lands somewhere. Sign in with Discord at https://sixcentral.co.uk/account (thirty seconds), then run /submit again.',
    );
  }

  const { error } = await sb.from('contributions').insert({
    profile_id: profile.id,
    type_key: typeKey,
    status: 'pending',
    payload: { details, source: source || null, about: about || null, via: 'discord' },
  });
  if (error) return reply('Could not submit. Try again in a moment.');

  const { data: ctype } = await sb
    .from('contribution_types')
    .select('points, label')
    .eq('key', typeKey)
    .single();

  return reply(
    `In the queue, @${profile.handle} \u2713 A moderator will check it, and if it holds up **+${ctype?.points ?? ''} Respect** lands automatically and #verified-log announces it.`,
  );
}
