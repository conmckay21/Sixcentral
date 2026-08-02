/**
 * Posts the Heist Finder board message into #xbox-heists and #ps5-heists: a
 * pinned "Start a heist" button per channel. The button is handled by the
 * interactions endpoint (custom_id raid_start:xbox / raid_start:ps5), which
 * walks the host through the heist pick, gamertag and note, then posts the crew
 * embed with the platform-role ping.
 *
 * Idempotent enough: re-running posts a fresh copy, so run it once. If you
 * post twice, delete and unpin the older message.
 *
 * Run (Node 18+), after the site deploy is live and setup.mjs has created
 * the raid channels:
 *   DISCORD_BOT_TOKEN=xxxx DISCORD_GUILD_ID=xxxx node discord/post-heist-boards.mjs
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
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const BOARDS = [
  { channel: 'xbox-heists', platform: 'xbox', label: 'Xbox' },
  { channel: 'ps5-heists', platform: 'ps5', label: 'PS5' },
];

const channels = await api('GET', `/guilds/${GUILD}/channels`);

for (const board of BOARDS) {
  const ch = channels.find((c) => c.type === 0 && c.name === board.channel);
  if (!ch) {
    console.error(`No #${board.channel} channel found. Run discord/setup.mjs or rename-heists.mjs first.`);
    continue;
  }

  const content = [
    `**The ${board.label} Heist Finder**`,
    '',
    'Running a heist and need a crew? Tap the button, pick the heist, drop your gamertag and an optional note. The crew gets pinged, people join with one tap, and every gamertag lands with you in the heist thread. When the crew is full, the post says so and the invites are on you.',
    '',
    'One platform per board, no crossplay, no exceptions. Full rules and the live board: https://sixcentral.co.uk/online',
  ].join('\n');

  const components = [
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: 'Start a heist', custom_id: `raid_start:${board.platform}` }, // custom_id frozen
      ],
    },
  ];

  const msg = await api('POST', `/channels/${ch.id}/messages`, { content, components });
  try {
    await api('PUT', `/channels/${ch.id}/pins/${msg.id}`);
    console.log(`Posted and pinned the Heist Finder board in #${board.channel}.`);
  } catch {
    console.log(`Posted the Heist Finder board in #${board.channel} (pin it manually).`);
  }
}
