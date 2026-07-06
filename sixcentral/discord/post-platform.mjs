/**
 * Posts the platform-select message into #welcome. Members tap a button to get
 * the PlayStation or Xbox role, which unlocks that console lounge. Buttons are
 * handled by the interactions endpoint (custom_id platform_ps5 / platform_xbox).
 *
 * Idempotent enough: re-running posts a fresh copy, so run it once. If you post
 * twice, delete the older message.
 *
 * Run (Node 18+):
 *   DISCORD_BOT_TOKEN=xxxx DISCORD_GUILD_ID=xxxx node discord/post-platform.mjs
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

const content = [
  '**Which platform are you playing GTA 6 on?**',
  '',
  'Pick one to unlock your crew lounge. You can change it any time by tapping the other.',
].join('\n');

const components = [
  {
    type: 1,
    components: [
      { type: 2, style: 1, label: 'PlayStation', custom_id: 'platform_ps5' },
      { type: 2, style: 3, label: 'Xbox', custom_id: 'platform_xbox' },
    ],
  },
];

const channels = await api('GET', `/guilds/${GUILD}/channels`);
const welcome = channels.find((c) => c.type === 0 && c.name === 'welcome');
if (!welcome) {
  console.error('No #welcome channel found. Run discord/setup.mjs first.');
  process.exit(1);
}

await api('POST', `/channels/${welcome.id}/messages`, { content, components });
console.log('Posted the platform picker in #welcome.');
