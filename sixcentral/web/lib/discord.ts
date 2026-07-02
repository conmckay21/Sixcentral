/**
 * Discord REST + interaction-verification helpers. Server-side only.
 * The bot has no gateway connection, everything is HTTPS: Discord calls
 * our interactions endpoint; we call Discord's REST API.
 */

const API = 'https://discord.com/api/v10';

/** Public key. Safe to bake; env var can override. */
export const DISCORD_PUBLIC_KEY =
  process.env.DISCORD_PUBLIC_KEY ??
  '66e3ed2a09d21cdb6554ae60f4a374c809a5d55cb5014a679d21e5bf7f4d2e9a';

export const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';

export const RANK_NAMES = [
  'Fresh off the Bus',
  'Corner Hustler',
  'Getaway Driver',
  'Made Member',
  'Heist Crew',
  'Lieutenant',
  'Underboss',
  'Shot Caller',
  'Kingpin',
  'City Legend',
];

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const clean = hex.trim();
  const out = new Uint8Array(new ArrayBuffer(clean.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** Ed25519 signature check. Discord signs timestamp+body; we verify. */
export async function verifyDiscordRequest(
  rawBody: string,
  signature: string,
  timestamp: string,
): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(DISCORD_PUBLIC_KEY),
      'Ed25519',
      false,
      ['verify'],
    );
    return await crypto.subtle.verify(
      'Ed25519',
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + rawBody),
    );
  } catch {
    return false;
  }
}

export async function discordApi(method: string, path: string, body?: unknown): Promise<unknown> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('DISCORD_BOT_TOKEN is not set');
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    const j = (await res.json()) as { retry_after?: number };
    await new Promise((r) => setTimeout(r, Math.ceil((j.retry_after ?? 1) * 1000)));
    return discordApi(method, path, body);
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

type Channel = { id: string; name: string; type: number };
type Role = { id: string; name: string };
type Member = { roles: string[] };

export async function findChannelId(name: string): Promise<string | null> {
  const chans = (await discordApi('GET', `/guilds/${GUILD_ID}/channels`)) as Channel[];
  return chans.find((c) => c.type === 0 && c.name === name)?.id ?? null;
}

export async function postChannelMessage(channelId: string, content: string): Promise<void> {
  await discordApi('POST', `/channels/${channelId}/messages`, {
    content,
    allowed_mentions: { parse: ['users'] },
  });
}

/**
 * Sets a member's rank role (removing any other rank roles) and adds any
 * extra roles (e.g. Founding Contributor). No-op if they're not in the guild.
 */
export async function setMemberRankRole(
  discordUserId: string,
  rankName: string,
  extraRoleNames: string[] = [],
): Promise<void> {
  const roles = (await discordApi('GET', `/guilds/${GUILD_ID}/roles`)) as Role[];
  const rankIds = new Set(
    roles.filter((r) => RANK_NAMES.includes(r.name)).map((r) => r.id),
  );
  const wanted = [rankName, ...extraRoleNames]
    .map((n) => roles.find((r) => r.name === n)?.id)
    .filter((id): id is string => !!id);

  let member: Member;
  try {
    member = (await discordApi('GET', `/guilds/${GUILD_ID}/members/${discordUserId}`)) as Member;
  } catch {
    return; // not in the server, nothing to sync
  }

  const next = Array.from(
    new Set([...member.roles.filter((id) => !rankIds.has(id)), ...wanted]),
  );
  await discordApi('PATCH', `/guilds/${GUILD_ID}/members/${discordUserId}`, { roles: next });
}
