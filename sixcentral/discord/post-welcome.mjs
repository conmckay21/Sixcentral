/**
 * Posts the welcome-gate message (rules summary + buttons) and the platform
 * picker to #welcome, and the full house rules to #start-here.
 *
 * Self-cleaning: it deletes the bot's own previous posts in those channels
 * first, so re-running always leaves exactly one clean set (no duplicates).
 * This replaces post-platform.mjs, run only this one:
 *
 *   DISCORD_BOT_TOKEN=xxxx DISCORD_GUILD_ID=xxxx node discord/post-welcome.mjs
 */
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
const APP_ID = '1522233114863341728';
if (!TOKEN || !GUILD) { console.error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.'); process.exit(1); }
const API = 'https://discord.com/api/v10';
const H = { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' };

const RULES = `# The house rules

**1. Respect people.** No harassment, hate, slurs, or dogpiling. Argue about the game, not each other.

**2. No leaked or hacked material. Ever.** No 2022-hack footage, no stolen builds, no datamined files from illegitimate sources. Posting it is an instant ban. It puts the whole community at legal risk. Rumours are welcome in #rumour-mill, clearly discussed as rumours.

**3. Contribute honestly.** Fabricated intel or plagiarised finds = ban. Respect is earned by being right, with receipts.

**4. Keep it PG-13.** The game's an 18; this server isn't. No porn, gore, or edgelording.

**5. No spam or self-promo.** Your clips belong in #clips; your crypto server doesn't belong anywhere.

**6. Mod calls are final.** Appeal politely in DMs to a @Moderator if you must.

That's it. Press the button below and you're in.`;

const GATE = `**Welcome to Six Central**, the companion community for GTA 6.

Before the server opens up, two things:

**The rules** (the long version is in #start-here once you're in): respect people, no leaked/hacked material ever, contribute honestly, keep it PG-13, no spam. Mod decisions are final.

**The launch list** (optional): pre-order intel, the launch-day checklist, and first access when the tracker goes live. Sent to the email on your SixCentral account, never shown here, unsubscribe any time.`;

const PLATFORM = `**Which platform are you playing GTA 6 on?**

Pick one to unlock your crew lounge. You can change it any time by tapping the other.`;

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

// Remove the bot's own earlier posts so re-runs never stack up.
async function clearBotPosts(channelId) {
  const msgs = await api('GET', `/channels/${channelId}/messages?limit=50`);
  const mine = (msgs || []).filter((m) => m.author && m.author.id === APP_ID);
  for (const m of mine) {
    await api('DELETE', `/channels/${channelId}/messages/${m.id}`);
  }
  if (mine.length) console.log(`  cleared ${mine.length} old post(s)`);
}

const channels = await api('GET', `/guilds/${GUILD}/channels`);
const welcome = channels.find((c) => c.type === 0 && c.name === 'welcome');
const startHere = channels.find((c) => c.type === 0 && c.name === 'start-here');
if (!welcome) { console.error('No welcome channel found, run setup.mjs first.'); process.exit(1); }

if (startHere) {
  await clearBotPosts(startHere.id);
  await api('POST', `/channels/${startHere.id}/messages`, { content: RULES });
  console.log('Rules posted to #start-here');
}

await clearBotPosts(welcome.id);

await api('POST', `/channels/${welcome.id}/messages`, {
  content: GATE,
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: 'I agree to the rules, let me in', custom_id: 'agree_rules' },
        { type: 2, style: 2, label: 'Add me to the launch list', custom_id: 'newsletter_optin' },
      ],
    },
  ],
});
console.log('Gate message with buttons posted to #welcome.');

await api('POST', `/channels/${welcome.id}/messages`, {
  content: PLATFORM,
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 1, label: 'PlayStation', custom_id: 'platform_ps5' },
        { type: 2, style: 3, label: 'Xbox', custom_id: 'platform_xbox' },
      ],
    },
  ],
});
console.log('Platform picker posted to #welcome. Press your own agree button to get Crew.');
