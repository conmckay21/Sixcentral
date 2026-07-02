/**
 * SixCentral Discord — server-as-code setup.
 *
 * Builds the full structure: 12 roles (the ten-rank ladder + Founding
 * Contributor + Moderator) and 9 channels across 5 categories, with
 * correct permissions (read-only feeds, private mod room).
 *
 * Idempotent: safe to re-run — anything that already exists by name is
 * skipped, so you can add members/messages and run it again after tweaks.
 *
 * Run (Node 18+):
 *   DISCORD_BOT_TOKEN=xxxx DISCORD_GUILD_ID=xxxx node discord/setup.mjs
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
if (!TOKEN || !GUILD) {
  console.error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID environment variables first.');
  process.exit(1);
}

const API = 'https://discord.com/api/v10';
const H = { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' };

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429) {
    const j = await res.json();
    const wait = Math.ceil((j.retry_after ?? 1) * 1000);
    console.log(`  rate limited — waiting ${wait}ms`);
    await new Promise((r) => setTimeout(r, wait));
    return api(method, path, body);
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.status === 204 ? null : res.json();
}

// ---- permissions (bit strings) ----
const VIEW = 1n << 10n;          // VIEW_CHANNEL
const SEND = 1n << 11n;          // SEND_MESSAGES
const P = (v) => v.toString();

// ---- the ladder, bottom to top (creation order sets sidebar order) ----
const RANK_ROLES = [
  { name: 'Fresh off the Bus', color: 0x6f6488 },
  { name: 'Corner Hustler',    color: 0x8a97a8 },
  { name: 'Getaway Driver',    color: 0x58b7c9 },
  { name: 'Made Member',       color: 0x1fe5d6 },
  { name: 'Heist Crew',        color: 0x37d67a },
  { name: 'Lieutenant',        color: 0xffc83d },
  { name: 'Underboss',         color: 0xff9e45 },
  { name: 'Shot Caller',       color: 0xff6b5d },
  { name: 'Kingpin',           color: 0xff5ca8 },
  { name: 'City Legend',       color: 0xff2e88 },
];
const SPECIAL_ROLES = [
  { name: 'Founding Contributor', color: 0x9b5cff, hoist: true,  mentionable: true },
  { name: 'Moderator',            color: 0xf4efe8, hoist: true,  mentionable: true },
  { name: 'Founder',              color: 0xffffff, hoist: true,  mentionable: true },
  // The membership role: granted by the welcome-gate button. Not hoisted —
  // the sidebar belongs to the rank ladder.
  { name: 'Crew',                 color: 0,        hoist: false, mentionable: false },
];

// ---- channel plan ----
// mode: 'open' (everyone talks) | 'readonly' (everyone reads, staff posts)
//       | 'staff' (invisible to everyone but Moderator)
const PLAN = [
  { category: 'START', channels: [
    { name: 'welcome',       mode: 'gate',     topic: 'Agree to the house rules to unlock the server.' },
    { name: 'start-here',    mode: 'readonly', topic: 'What SixCentral is, how Respect works, the rules. Read me first.' },
    { name: 'announcements', mode: 'readonly', topic: 'Official drops: news, site posts, milestones.' },
  ]},
  { category: 'THE NEWS DESK', channels: [
    { name: 'gta6-news',   mode: 'open', topic: 'Confirmed news only — the facts desk.' },
    { name: 'rumour-mill', mode: 'open', topic: 'Rumours, clearly labelled. Heat ratings live on the site.' },
  ]},
  { category: 'THE COME-UP', channels: [
    { name: 'submit-intel', mode: 'open', slowmode: 30, topic: 'Structured contributions — use /submit. Confirmed = Respect.' },
    { name: 'verified-log', mode: 'readonly', topic: 'Every accepted contribution, announced. The receipts.' },
  ]},
  { category: 'COMMUNITY', channels: [
    { name: 'general', mode: 'open', topic: 'Everything else.' },
    { name: 'clips',   mode: 'open', slowmode: 15, topic: 'Trailer moments and hype now — your best in-game clips at launch.' },
  ]},
  { category: 'STAFF', channels: [
    { name: 'mod-room', mode: 'staff', topic: 'Queue coordination and calls.' },
  ]},
];

async function main() {
  console.log('Fetching current server state…');
  const existingRoles = await api('GET', `/guilds/${GUILD}/roles`);
  const existingChannels = await api('GET', `/guilds/${GUILD}/channels`);
  const everyone = existingRoles.find((r) => r.name === '@everyone');
  const APP_ID = '1522233114863341728';
  const botRole = existingRoles.find((r) => r.tags && r.tags.bot_id === APP_ID);
  if (!botRole) {
    console.warn('WARN: bot role not found — invite the bot to the server first, then re-run,');
    console.warn('      otherwise the bot cannot post in #verified-log / #announcements.');
  }

  // ---- roles ----
  const roleIds = {};
  for (const spec of [...RANK_ROLES, ...SPECIAL_ROLES]) {
    const found = existingRoles.find((r) => r.name === spec.name);
    if (found) {
      roleIds[spec.name] = found.id;
      console.log(`role exists:   ${spec.name}`);
      continue;
    }
    const isRank = RANK_ROLES.some((r) => r.name === spec.name);
    const created = await api('POST', `/guilds/${GUILD}/roles`, {
      name: spec.name,
      color: spec.color,
      hoist: 'hoist' in spec ? spec.hoist : true,
      mentionable: 'mentionable' in spec ? spec.mentionable : !isRank,
      permissions: '0',
    });
    roleIds[spec.name] = created.id;
    console.log(`role created:  ${spec.name}`);
  }

  // ---- channels ----
  const catIds = {};
  for (const group of PLAN) {
    let cat = existingChannels.find((c) => c.type === 4 && c.name.toUpperCase() === group.category);
    if (!cat) {
      cat = await api('POST', `/guilds/${GUILD}/channels`, { name: group.category, type: 4 });
      console.log(`category created: ${group.category}`);
    } else {
      console.log(`category exists:  ${group.category}`);
    }
    catIds[group.category] = cat.id;

    for (const ch of group.channels) {
      // Declarative permission model — the whole server sits behind the
      // Crew role, granted by the welcome-gate button:
      //   gate      @everyone sees it (read-only); Crew no longer does
      //   open      Crew view + talk; invisible pre-agreement
      //   readonly  Crew view; staff + bot post
      //   staff     Moderator + bot only
      const overwrites = [];
      const crew = roleIds['Crew'];
      const mod = roleIds['Moderator'];
      if (ch.mode === 'gate') {
        overwrites.push({ id: everyone.id, type: 0, allow: P(VIEW), deny: P(SEND) });
        overwrites.push({ id: crew, type: 0, deny: P(VIEW) });
        overwrites.push({ id: mod, type: 0, allow: P(VIEW | SEND) });
      }
      if (ch.mode === 'open') {
        overwrites.push({ id: everyone.id, type: 0, deny: P(VIEW) });
        overwrites.push({ id: crew, type: 0, allow: P(VIEW) });
        overwrites.push({ id: mod, type: 0, allow: P(VIEW | SEND) });
      }
      if (ch.mode === 'readonly') {
        overwrites.push({ id: everyone.id, type: 0, deny: P(VIEW | SEND) });
        overwrites.push({ id: crew, type: 0, allow: P(VIEW) });
        overwrites.push({ id: mod, type: 0, allow: P(VIEW | SEND) });
      }
      if (ch.mode === 'staff') {
        overwrites.push({ id: everyone.id, type: 0, deny: P(VIEW) });
        overwrites.push({ id: mod, type: 0, allow: P(VIEW | SEND) });
      }
      if (botRole) overwrites.push({ id: botRole.id, type: 0, allow: P(VIEW | SEND) });

      const found = existingChannels.find((c) => c.type === 0 && c.name === ch.name);
      if (found) {
        await api('PATCH', `/channels/${found.id}`, {
          topic: ch.topic,
          rate_limit_per_user: ch.slowmode ?? 0,
          permission_overwrites: overwrites,
        });
        console.log(`  channel updated: #${ch.name}`);
        continue;
      }
      await api('POST', `/guilds/${GUILD}/channels`, {
        name: ch.name,
        type: 0,
        parent_id: cat.id,
        topic: ch.topic,
        rate_limit_per_user: ch.slowmode ?? 0,
        permission_overwrites: overwrites,
      });
      console.log(`  channel created: #${ch.name}`);
    }
  }

  console.log('\nDone. Structure is in place — re-run any time after tweaks; existing items are never duplicated.');
  console.log('Manual finishing touches (one-time, in Discord settings):');
  console.log('  • Server Settings → Safety: verification level Medium, enable AutoMod presets');
  console.log('  • Server Settings → Moderation: require 2FA for moderator actions');
  console.log('  • Drag the SixCentral bot role above the rank roles if it is not already');
  console.log('  • Run `node discord/post-welcome.mjs` once to post the rules + gate buttons');
  console.log('  • Existing members (including you) must press the agree button to get Crew');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
