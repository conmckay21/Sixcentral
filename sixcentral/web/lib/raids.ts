import type { SupabaseClient } from '@supabase/supabase-js';
import { discordApi, GUILD_ID } from '@/lib/discord';

/**
 * The Raid Finder, Discord side. Raids live in raid_lobbies/raid_lobby_members
 * (shared with the web board); this module owns everything the bot does with
 * them: the start flow, joins and leaves, the live roster embed, and firing
 * gamertags at the host.
 *
 * Identity: Discord users are keyed by discord_user_id on member rows and
 * host_discord_id on lobbies. Gamertags are remembered per platform in
 * discord_gamertags (ask once, prefill forever), preferring a linked
 * SixCentral profile's stored tag when one exists.
 */

export type Platform = 'xbox' | 'ps5';

type RaidType = { id: string; slug: string; name: string; min_players: number; max_players: number };
type Lobby = {
  id: string;
  raid_type_id: string;
  platform: Platform;
  host_discord_id: string | null;
  note: string | null;
  status: string;
  discord_channel_id: string | null;
  discord_message_id: string | null;
  discord_thread_id: string | null;
  raid_types: RaidType;
};
type Member = { discord_user_id: string | null; gamertag: string; joined_at: string };

const SITE = 'https://sixcentral.co.uk';
const COLOURS = { open: 0xff2e88, full: 0xffc83d, closed: 0x3a3450 } as const;
const PLATFORM_LABEL: Record<Platform, string> = { xbox: 'XBOX', ps5: 'PS5' };
const PLATFORM_ROLE: Record<Platform, string> = { xbox: 'Xbox', ps5: 'PlayStation' };

export function isPlatform(v: string): v is Platform {
  return v === 'xbox' || v === 'ps5';
}

// ---------------------------------------------------------------------------
// Gamertag memory
// ---------------------------------------------------------------------------

/** Linked profile tag first, then the remembered Discord tag. */
export async function getStoredTag(
  sb: SupabaseClient,
  discordId: string,
  platform: Platform,
): Promise<string | null> {
  const col = platform === 'xbox' ? 'xbox_gamertag' : 'psn_id';
  const { data: profile } = await sb
    .from('profiles')
    .select(`${col}`)
    .eq('discord_id', discordId)
    .maybeSingle();
  const fromProfile = (profile as Record<string, string | null> | null)?.[col];
  if (fromProfile) return fromProfile;

  const { data: remembered } = await sb
    .from('discord_gamertags')
    .select('gamertag')
    .eq('discord_user_id', discordId)
    .eq('platform', platform)
    .maybeSingle();
  return remembered?.gamertag ?? null;
}

/** Bounded lookup: the interaction must answer inside 3s, so never wait long. */
export async function getStoredTagFast(
  sb: SupabaseClient,
  discordId: string,
  platform: Platform,
  ms = 1200,
): Promise<string | null> {
  return Promise.race([
    getStoredTag(sb, discordId, platform).catch(() => null),
    new Promise<null>((r) => setTimeout(() => r(null), ms)),
  ]);
}

/** Remember the tag, and backfill a linked profile that has none stored. */
export async function rememberTag(
  sb: SupabaseClient,
  discordId: string,
  platform: Platform,
  gamertag: string,
): Promise<void> {
  await sb
    .from('discord_gamertags')
    .upsert(
      { discord_user_id: discordId, platform, gamertag, updated_at: new Date().toISOString() },
      { onConflict: 'discord_user_id,platform' },
    );
  const col = platform === 'xbox' ? 'xbox_gamertag' : 'psn_id';
  const { data: profile } = await sb
    .from('profiles')
    .select(`id, ${col}`)
    .eq('discord_id', discordId)
    .maybeSingle();
  const row = profile as { id: string; [k: string]: string | null } | null;
  if (row && !row[col]) {
    await sb.from('profiles').update({ [col]: gamertag }).eq('id', row.id);
  }
}

// ---------------------------------------------------------------------------
// Interaction payload builders (the start flow)
// ---------------------------------------------------------------------------

/** Ephemeral raid-type picker, edited into the deferred reply. */
export async function buildRaidPicker(
  sb: SupabaseClient,
  platform: Platform,
): Promise<{ content: string; components: unknown[] }> {
  const { data } = await sb
    .from('raid_types')
    .select('id, name')
    .eq('active', true)
    .order('sort');
  const types = (data ?? []) as { id: string; name: string }[];
  if (!types.length) return { content: 'No raids are listed right now. Tell a moderator.', components: [] };
  return {
    content: `**Start a ${PLATFORM_LABEL[platform]} raid.** Which one are you running?`,
    components: [
      {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: `raid_pick:${platform}`,
            placeholder: 'Pick the raid',
            options: types.slice(0, 25).map((t) => ({ label: t.name.slice(0, 100), value: t.id })),
          },
        ],
      },
    ],
  };
}

/** Modal shown immediately after the pick (must be the initial response). */
export function hostModal(raidTypeId: string, platform: Platform, storedTag: string | null) {
  return {
    type: 9,
    data: {
      custom_id: `raid_host_modal:${raidTypeId}:${platform}`,
      title: 'Start the raid',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'gamertag',
              label: platform === 'xbox' ? 'Your Xbox gamertag' : 'Your PSN ID',
              style: 1,
              required: true,
              max_length: 40,
              ...(storedTag ? { value: storedTag } : {}),
            },
          ],
        },
        {
          type: 1,
          components: [
            {
              type: 4,
              custom_id: 'note',
              label: 'Note (optional): time, mics, setups done',
              style: 1,
              required: false,
              max_length: 120,
            },
          ],
        },
      ],
    },
  };
}

/** Modal shown when a joiner has no remembered tag yet. */
export function joinModal(lobbyId: string, platform: Platform | null) {
  const label =
    platform === 'xbox' ? 'Your Xbox gamertag' : platform === 'ps5' ? 'Your PSN ID' : 'Your gamertag or PSN ID';
  return {
    type: 9,
    data: {
      custom_id: `raid_join_modal:${lobbyId}`,
      title: 'Join the raid',
      components: [
        {
          type: 1,
          components: [
            { type: 4, custom_id: 'gamertag', label, style: 1, required: true, max_length: 40 },
          ],
        },
      ],
    },
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderRaid(lobby: Lobby, members: Member[]) {
  const raid = lobby.raid_types;
  const max = raid.max_players;
  const done = lobby.status === 'done' || lobby.status === 'cancelled';
  const full = lobby.status === 'full';
  const colour = done ? COLOURS.closed : full ? COLOURS.full : COLOURS.open;

  const crew = members
    .map((m, i) => `${i + 1}. **${m.gamertag}**${i === 0 ? ' (host)' : ''}`)
    .join('\n');
  const state = done ? 'CLOSED' : full ? 'FULL' : `${members.length}/${max} — tap Join`;

  const lines: string[] = [];
  if (lobby.note) lines.push(lobby.note);
  if (raid.min_players > members.length && !done) {
    lines.push(`Needs ${raid.min_players} minimum to launch.`);
  }

  return {
    embeds: [
      {
        title: `${raid.name} · ${PLATFORM_LABEL[lobby.platform]}`,
        description: lines.join('\n') || undefined,
        color: colour,
        fields: [
          { name: `Crew — ${state}`, value: crew || 'Nobody yet.', inline: false },
        ],
        footer: { text: `SixCentral Raid Finder · ${SITE.replace('https://', '')}/online` },
      },
    ],
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 3,
            label: full ? 'Full' : 'Join',
            custom_id: `raid_join:${lobby.id}`,
            disabled: done || full,
          },
          { type: 2, style: 2, label: 'Leave', custom_id: `raid_leave:${lobby.id}`, disabled: done },
          { type: 2, style: 4, label: 'Close', custom_id: `raid_close:${lobby.id}`, disabled: done },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Discord plumbing
// ---------------------------------------------------------------------------

async function platformRoleId(platform: Platform): Promise<string | null> {
  const roles = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as { id: string; name: string }[];
  return roles.find((r) => r.name === PLATFORM_ROLE[platform])?.id ?? null;
}

async function threadSay(threadId: string | null, content: string, mentionUserIds: string[] = []) {
  if (!threadId) return;
  try {
    await discordApi('POST', `/channels/${threadId}/messages`, {
      content,
      allowed_mentions: { users: mentionUserIds },
    });
  } catch {
    /* thread gone or perms missing; the embed still carries the roster */
  }
}

async function dmUser(discordId: string, content: string) {
  try {
    const dm = (await discordApi('POST', '/users/@me/channels', { recipient_id: discordId })) as { id: string };
    await discordApi('POST', `/channels/${dm.id}/messages`, { content });
  } catch {
    /* DMs off; the thread ping covers it */
  }
}

async function editRaidMessage(lobby: Lobby, members: Member[]) {
  if (!lobby.discord_channel_id || !lobby.discord_message_id) return;
  await discordApi(
    'PATCH',
    `/channels/${lobby.discord_channel_id}/messages/${lobby.discord_message_id}`,
    renderRaid(lobby, members),
  );
}

async function loadLobby(sb: SupabaseClient, lobbyId: string): Promise<Lobby | null> {
  const { data } = await sb
    .from('raid_lobbies')
    .select('id, raid_type_id, platform, host_discord_id, note, status, discord_channel_id, discord_message_id, discord_thread_id, raid_types(id, slug, name, min_players, max_players)')
    .eq('id', lobbyId)
    .maybeSingle();
  return (data as unknown as Lobby) ?? null;
}

async function loadMembers(sb: SupabaseClient, lobbyId: string): Promise<Member[]> {
  const { data } = await sb
    .from('raid_lobby_members')
    .select('discord_user_id, gamertag, joined_at')
    .eq('lobby_id', lobbyId)
    .order('joined_at');
  return (data ?? []) as Member[];
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function createLobby(
  sb: SupabaseClient,
  args: {
    raidTypeId: string;
    platform: Platform;
    hostDiscordId: string;
    gamertag: string;
    note: string;
    channelId: string;
  },
): Promise<string> {
  const { data: raid } = await sb
    .from('raid_types')
    .select('id, slug, name, min_players, max_players')
    .eq('id', args.raidTypeId)
    .maybeSingle();
  if (!raid) return 'That raid is no longer listed. Start again.';

  await rememberTag(sb, args.hostDiscordId, args.platform, args.gamertag);

  const { data: inserted, error } = await sb
    .from('raid_lobbies')
    .insert({
      raid_type_id: args.raidTypeId,
      platform: args.platform,
      host_discord_id: args.hostDiscordId,
      note: args.note || null,
    })
    .select('id')
    .single();
  if (error || !inserted) return 'Could not open the raid. Try again in a moment.';

  await sb.from('raid_lobby_members').insert({
    lobby_id: inserted.id,
    discord_user_id: args.hostDiscordId,
    gamertag: args.gamertag,
  });

  const lobby = await loadLobby(sb, inserted.id);
  const members = await loadMembers(sb, inserted.id);
  if (!lobby) return 'Could not open the raid. Try again in a moment.';

  const roleId = await platformRoleId(args.platform);
  const ping = roleId ? `<@&${roleId}> ` : '';
  const posted = (await discordApi('POST', `/channels/${args.channelId}/messages`, {
    content: `${ping}**${(raid as RaidType).name}** crew forming — hosted by **${args.gamertag}**`,
    allowed_mentions: roleId ? { roles: [roleId] } : { parse: [] },
    ...renderRaid({ ...lobby, discord_channel_id: args.channelId }, members),
  })) as { id: string };

  let threadId: string | null = null;
  try {
    const thread = (await discordApi(
      'POST',
      `/channels/${args.channelId}/messages/${posted.id}/threads`,
      { name: `${(raid as RaidType).name} crew`.slice(0, 100), auto_archive_duration: 1440 },
    )) as { id: string };
    threadId = thread.id;
  } catch {
    /* thread perms missing; everything still works off the embed */
  }

  await sb
    .from('raid_lobbies')
    .update({
      discord_channel_id: args.channelId,
      discord_message_id: posted.id,
      discord_thread_id: threadId,
    })
    .eq('id', inserted.id);

  await threadSay(
    threadId,
    `Crew chat for **${(raid as RaidType).name}**. Host: **${args.gamertag}** (<@${args.hostDiscordId}>). Gamertags land here as people join.`,
    [args.hostDiscordId],
  );

  return `Raid posted \u2713 The ${PLATFORM_LABEL[args.platform]} crew has been pinged. Gamertags come to you as people join.`;
}

export async function joinLobby(
  sb: SupabaseClient,
  lobbyId: string,
  discordId: string,
  gamertag: string,
): Promise<string> {
  const lobby = await loadLobby(sb, lobbyId);
  if (!lobby) return 'That raid is gone.';
  if (lobby.status !== 'open') return 'That raid is closed or already full.';

  await rememberTag(sb, discordId, lobby.platform, gamertag);

  const { error } = await sb.from('raid_lobby_members').insert({
    lobby_id: lobbyId,
    discord_user_id: discordId,
    gamertag,
  });
  if (error) {
    return error.code === '23505' ? 'You\u2019re already on this crew \u2713' : 'Could not join. Try again.';
  }

  const members = await loadMembers(sb, lobbyId);
  const max = lobby.raid_types.max_players;
  const nowFull = members.length >= max;
  if (nowFull) {
    await sb.from('raid_lobbies').update({ status: 'full' }).eq('id', lobbyId);
    lobby.status = 'full';
  }
  await editRaidMessage(lobby, members);

  const host = lobby.host_discord_id;
  await threadSay(
    lobby.discord_thread_id,
    host
      ? `<@${host}> — **${gamertag}** is in (${members.length}/${max}). Add them and send the invite.`
      : `**${gamertag}** is in (${members.length}/${max}).`,
    host ? [host] : [],
  );

  if (nowFull && host) {
    const roster = members.map((m) => m.gamertag).join('\n');
    await threadSay(lobby.discord_thread_id, `Crew full. Full roster for invites:\n${roster}`, []);
    await dmUser(
      host,
      `Your **${lobby.raid_types.name}** crew is full. Gamertags to invite:\n${roster}`,
    );
  }

  return nowFull
    ? `You\u2019re in, and that fills the crew \u2713 **${lobby.raid_types.name}** is a go — watch the thread.`
    : `You\u2019re in \u2713 The host has your gamertag. Watch the raid thread for the invite.`;
}

export async function leaveLobby(sb: SupabaseClient, lobbyId: string, discordId: string): Promise<string> {
  const lobby = await loadLobby(sb, lobbyId);
  if (!lobby) return 'That raid is gone.';
  if (lobby.host_discord_id === discordId) {
    return 'Hosts close rather than leave — tap Close if the run is off.';
  }

  const { data: gone } = await sb
    .from('raid_lobby_members')
    .delete()
    .eq('lobby_id', lobbyId)
    .eq('discord_user_id', discordId)
    .select('gamertag');
  if (!gone?.length) return 'You were not on this crew.';

  if (lobby.status === 'full') {
    await sb.from('raid_lobbies').update({ status: 'open' }).eq('id', lobbyId);
    lobby.status = 'open';
  }
  const members = await loadMembers(sb, lobbyId);
  await editRaidMessage(lobby, members);
  await threadSay(
    lobby.discord_thread_id,
    `**${gone[0].gamertag}** dropped out (${members.length}/${lobby.raid_types.max_players}). A spot is open again.`,
  );
  return 'You\u2019ve left the crew.';
}

export async function closeLobby(sb: SupabaseClient, lobbyId: string, discordId: string): Promise<string> {
  const lobby = await loadLobby(sb, lobbyId);
  if (!lobby) return 'That raid is gone.';
  if (lobby.host_discord_id !== discordId) return 'Only the host can close this raid.';
  if (lobby.status === 'done' || lobby.status === 'cancelled') return 'Already closed.';

  await sb.from('raid_lobbies').update({ status: 'done' }).eq('id', lobbyId);
  lobby.status = 'done';
  const members = await loadMembers(sb, lobbyId);
  await editRaidMessage(lobby, members);
  await threadSay(lobby.discord_thread_id, 'The host closed this raid. Good hunting.');
  return 'Raid closed \u2713';
}

/** Sweep: close anything past its expiry and grey out the Discord post. */
export async function sweepExpired(sb: SupabaseClient): Promise<number> {
  const { data } = await sb
    .from('raid_lobbies')
    .update({ status: 'done' })
    .in('status', ['open', 'full'])
    .lt('expires_at', new Date().toISOString())
    .select('id');
  const closed = (data ?? []) as { id: string }[];
  for (const row of closed) {
    const lobby = await loadLobby(sb, row.id);
    if (!lobby) continue;
    const members = await loadMembers(sb, row.id);
    try {
      await editRaidMessage(lobby, members);
      await threadSay(lobby.discord_thread_id, 'This raid timed out and has been closed.');
    } catch {
      /* message deleted; row state is what matters */
    }
  }
  return closed.length;
}
