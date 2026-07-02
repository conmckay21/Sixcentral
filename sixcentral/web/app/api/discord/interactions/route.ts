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

/** Stored verbatim as the consent record — matches the #welcome gate message. */
const DISCORD_CONSENT =
  'The launch list (optional): pre-order intel, the launch-day checklist, and first access when the tracker goes live \u2014 sent to the email on your SixCentral account. Never shown here, unsubscribe any time.';

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
  if (!discordId) return reply('Could not identify you — try again.');

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
  try {
    const roles = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as { id: string; name: string }[];
    const crew = roles.find((r) => r.name === 'Crew');
    if (!crew) return reply('The Crew role is missing \u2014 tell a moderator.');
    await discordApi('PUT', `/guilds/${GUILD_ID}/members/${discordId}/roles/${crew.id}`);
    return reply(
      'Welcome to the crew \u2713 The server\u2019s open \u2014 start in #gta6-news, and if you know something worth verifying, /submit earns Respect.',
    );
  } catch {
    return reply('Something hiccuped \u2014 try the button again in a moment.');
  }
}

async function handleNewsletterOptin(discordId: string) {
  const sb = serviceClient();
  if (!sb) return reply('The launch list is briefly offline \u2014 try again shortly.');

  const { data: profile } = await sb
    .from('profiles')
    .select('id, handle')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return reply(
      'One step first: the launch list uses the email on your SixCentral account, so sign in with Discord at https://sixcentral.co.uk/account (thirty seconds, links automatically) \u2014 then tap this again.',
    );
  }

  const { data: userRes } = await sb.auth.admin.getUserById(profile.id);
  const email = userRes?.user?.email?.toLowerCase();
  if (!email) return reply('Could not find an email on your account \u2014 add one at https://sixcentral.co.uk/account.');

  const { error } = await sb
    .from('subscribers')
    .insert({ email, source: 'discord', consent_text: DISCORD_CONSENT });

  if (error && error.code === '23505') {
    return reply('You\u2019re already on the launch list \u2713');
  }
  if (error) return reply('Could not add you just now \u2014 try again in a moment.');
  return reply(
    'On the list \u2713 Launch-critical updates go to the email on your SixCentral account \u2014 it\u2019s never shown here, and you can unsubscribe any time.',
  );
}

async function handleRank(discordId: string) {
  const sb = serviceClient();
  if (!sb) return reply('The Come-Up is briefly offline — try again shortly.');

  const { data: profile } = await sb
    .from('profiles')
    .select('handle, respect, rank_id, title, is_staff')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return reply(
      'Your Discord isn\u2019t linked to a SixCentral profile yet. Sign in with Discord at https://sixcentral.co.uk/account and it links automatically \u2014 then your Respect shows up here.',
    );
  }

  if (profile.is_staff) {
    return reply(`**@${profile.handle}** \u2014 **${profile.title ?? 'Staff'}** \u00b7 above the ladder.`);
  }

  const { data: ranks } = await sb.from('ranks').select('id, name, min_respect, perk').order('id');
  const rank = ranks?.find((r) => r.id === profile.rank_id);
  const next = ranks?.find((r) => r.id === profile.rank_id + 1);

  const lines = [
    `**@${profile.handle}** \u2014 **${rank?.name ?? 'Fresh off the Bus'}**`,
    `Respect: **${profile.respect.toLocaleString('en-GB')}**`,
  ];
  if (next) {
    lines.push(
      `Next: **${next.name}** at ${next.min_respect.toLocaleString('en-GB')} (${Math.max(
        next.min_respect - profile.respect,
        0,
      ).toLocaleString('en-GB')} to go)${next.perk ? ` \u2014 unlocks: ${next.perk}` : ''}`,
    );
  } else {
    lines.push('Top of the ladder. City Legend.');
  }
  return reply(lines.join('\n'));
}

async function handleSubmit(interaction: Interaction, discordId: string) {
  const sb = serviceClient();
  if (!sb) return reply('Submissions are briefly offline \u2014 try again shortly.');

  const opts = new Map((interaction.data?.options ?? []).map((o) => [o.name, o.value ?? '']));
  const typeKey = opts.get('type') === 'intel' ? 'intel' : 'verified_correction';
  const details = (opts.get('details') ?? '').trim();
  const source = (opts.get('source') ?? '').trim();
  const about = (opts.get('about') ?? '').trim();

  if (details.length < 20) {
    return reply('Give the mods something to verify \u2014 at least a sentence or two of detail.');
  }

  const { data: profile } = await sb
    .from('profiles')
    .select('id, handle')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (!profile) {
    return reply(
      'Almost \u2014 submissions need a linked SixCentral profile so the Respect lands somewhere. Sign in with Discord at https://sixcentral.co.uk/account (thirty seconds), then run /submit again.',
    );
  }

  const { error } = await sb.from('contributions').insert({
    profile_id: profile.id,
    type_key: typeKey,
    status: 'pending',
    payload: { details, source: source || null, about: about || null, via: 'discord' },
  });
  if (error) return reply('Could not submit \u2014 try again in a moment.');

  const { data: ctype } = await sb
    .from('contribution_types')
    .select('points, label')
    .eq('key', typeKey)
    .single();

  return reply(
    `In the queue, @${profile.handle} \u2713 A moderator will verify it \u2014 if it holds up, **+${ctype?.points ?? ''} Respect** lands automatically and #verified-log announces it.`,
  );
}
