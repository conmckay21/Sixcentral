/**
 * One-time migration: raids become heists. Renames #xbox-raids and #ps5-raids
 * to #xbox-heists and #ps5-heists in place (permissions and history survive a
 * rename), updates the topics, deletes the bot's old Raid Finder board posts,
 * and posts the fresh Heist Finder boards. Idempotent: safe to re-run.
 *
 * Run (Node 18+), with the site deploy carrying the heist copy already live:
 *   DISCORD_BOT_TOKEN=xxxx DISCORD_GUILD_ID=xxxx node discord/rename-heists.mjs
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
if (!TOKEN || !GUILD) {
  console.error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID environment variables first.');
  process.exit(1);
}

const API = 'https://discord.com/api/v10';
const BOT_USER_ID = '1522233114863341728';
const H = { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' };

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const PLAN = [
  {
    from: 'xbox-raids',
    to: 'xbox-heists',
    platform: 'xbox',
    label: 'Xbox',
    topic: 'GTA Online heists, Xbox only. Tap Start a heist, crews form here, gamertags in the thread.',
  },
  {
    from: 'ps5-raids',
    to: 'ps5-heists',
    platform: 'ps5',
    label: 'PS5',
    topic: 'GTA Online heists, PS5 only. Tap Start a heist, crews form here, gamertags in the thread.',
  },
];

const channels = await api('GET', `/guilds/${GUILD}/channels`);

for (const step of PLAN) {
  let ch = channels.find((c) => c.type === 0 && c.name === step.from);
  const already = channels.find((c) => c.type === 0 && c.name === step.to);
  if (!ch && already) {
    ch = already;
    console.log(`#${step.to} already renamed.`);
  } else if (ch) {
    await api('PATCH', `/channels/${ch.id}`, { name: step.to, topic: step.topic });
    console.log(`Renamed #${step.from} to #${step.to}.`);
  } else {
    console.error(`Neither #${step.from} nor #${step.to} found. Run discord/setup.mjs.`);
    continue;
  }

  // Clear the bot's old board posts so only the Heist Finder board remains.
  const recent = await api('GET', `/channels/${ch.id}/messages?limit=25`);
  for (const msg of recent) {
    if (msg.author?.id === BOT_USER_ID && String(msg.content).includes('Raid Finder')) {
      await api('DELETE', `/channels/${ch.id}/messages/${msg.id}`);
      console.log(`Deleted old board post in #${step.to}.`);
    }
  }

  const content = [
    `**The ${step.label} Heist Finder**`,
    '',
    'Running a heist and need a crew? Tap the button, pick the heist, drop your gamertag and an optional note. The crew gets pinged, people join with one tap, and every gamertag lands with you in the heist thread. When the crew is full, the post says so and the invites are on you.',
    '',
    'One platform per board, no crossplay, no exceptions. Full rules and the live board: https://sixcentral.co.uk/online',
  ].join('\n');

  const components = [
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: 'Start a heist', custom_id: `raid_start:${step.platform}` }, // custom_id frozen
      ],
    },
  ];

  const msg = await api('POST', `/channels/${ch.id}/messages`, { content, components });
  try {
    await api('PUT', `/channels/${ch.id}/pins/${msg.id}`);
    console.log(`Posted and pinned the Heist Finder board in #${step.to}.`);
  } catch {
    console.log(`Posted the Heist Finder board in #${step.to} (pin it manually).`);
  }
}
