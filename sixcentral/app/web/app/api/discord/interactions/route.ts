import { createClient } from '@supabase/supabase-js';
import { discordApi, verifyDiscordRequest, GUILD_ID } from '@/lib/discord';

export const runtime = 'nodejs';

/** Discord interactions endpoint: PING, /submit, /rank. */

type Option = { name: string; value?: string };
type Interaction = {
  type: number;
  data?: { name?: string; options?: Option[]; custom_id?: string };
  member?: { user?: { id: string } };
  user?: { id: string };
};

/** Stored verbatim as the consent record. Matches the #welcome gate message. */
const DISCORD_CONSENT =
  'The launch list (optional): pre-order intel, the launch-day checklist, and first access when the tracker goes live. Sent to the email on your SixCentral account, never shown here, unsubscribe any time.';

const EPHEMERAL = 64;

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
  }

  // Button presses from the #welcome gate
  if (interaction.type === 3) {
    const button = interaction.data?.custom_id;
    if (button === 'agree_rules') return handleAgreeRules(discordId);
    if (button === 'newsletter_optin') return handleNewsletterOptin(discordId);
  }

  return reply('Unknown command.');
}

async function handleAgreeRules(discordId: string) {
  // The server only opens for linked SixCentral accounts. Land freely,
  // unlock with membership.
  const sb = serviceClient();
  if (!sb) return reply('The gate is briefly offline. Try again shortly.');
  const { data: profile } = await sb
    .from('profiles')
    .select('id, handle')
    .eq('discord_id', discordId)
    .maybeSingle();
  if (!profile) {
    return reply(
      'One step first: the crew runs on SixCentral accounts. Sign in with Discord at https://sixcentral.co.uk/account (thirty seconds, links itself), then tap Agree again and the server opens.',
    );
  }
  try {
    const roles = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as { id: string; name: string }[];
    const crew = roles.find((r) => r.name === 'Crew');
    if (!crew) return reply('The Crew role is missing. Tell a moderator.');
    await discordApi('PUT', `/guilds/${GUILD_ID}/members/${discordId}/roles/${crew.id}`);
    return reply(
      `Welcome to the crew, @${profile.handle} ✓ The server is open. Start in #gta6-news, and if you know something worth verifying, /submit earns Respect.`,
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
    return reply('You’re already on the launch list ✓');
  }
  if (error) return reply('Could not add you just now. Try again in a moment.');
  return reply(
    'On the list ✓ Launch-critical updates go to the email on your SixCentral account. Never shown here, unsubscribe any time.',
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
    return reply(`**@${profile.handle}** · **${profile.title ?? 'Staff'}** · above the ladder.`);
  }

  const { data: ranks } = await sb.from('ranks').select('id, name, min_respect, perk').order('id');
  const rank = ranks?.find((r) => r.id === profile.rank_id);
  const next = ranks?.find((r) => r.id === profile.rank_id + 1);

  const lines = [
    `**@${profile.handle}** · **${rank?.name ?? 'Fresh off the Bus'}**`,
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
    `In the queue, @${profile.handle} ✓ A moderator will check it, and if it holds up **+${ctype?.points ?? ''} Respect** lands automatically and #verified-log announces it.`,
  );
}
