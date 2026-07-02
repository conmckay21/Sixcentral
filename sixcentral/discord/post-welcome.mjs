/**
 * Posts the welcome-gate message (rules summary + buttons) to #welcome and
 * the full house rules to #start-here. Run once after setup.mjs:
 *
 *   DISCORD_BOT_TOKEN=xxxx DISCORD_GUILD_ID=xxxx node discord/post-welcome.mjs
 */
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
if (!TOKEN || !GUILD) { console.error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.'); process.exit(1); }
const API = 'https://discord.com/api/v10';
const H = { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' };

const RULES = `# The house rules

**1. Respect people.** No harassment, hate, slurs, or dogpiling. Argue about the game, not each other.

**2. No leaked or hacked material. Ever.** No 2022-hack footage, no stolen builds, no datamined files from illegitimate sources. Posting it is an instant ban — it puts the whole community at legal risk. Rumours are welcome in #rumour-mill, clearly discussed as rumours.

**3. Contribute honestly.** Fabricated intel or plagiarised finds = ban. Respect is earned by being right, with receipts.

**4. Keep it PG-13.** The game's an 18; this server isn't. No porn, gore, or edgelording.

**5. No spam or self-promo.** Your clips belong in #clips; your crypto server doesn't belong anywhere.

**6. Mod calls are final.** Appeal politely in DMs to a @Moderator if you must.

That's it. Press the button below and you're in.`;

const GATE = `**Welcome to Six Central** — the UK companion community for GTA 6.

Before the server opens up, two things:

**The rules** (the long version is in #start-here once you're in): respect people, no leaked/hacked material ever, contribute honestly, keep it PG-13, no spam. Mod decisions are final.

**The launch list** (optional): pre-order intel, the launch-day checklist, and first access when the tracker goes live — sent to the email on your SixCentral account. Never shown here, unsubscribe any time.`;

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
  return res.json();
}

const channels = await api('GET', `/guilds/${GUILD}/channels`);
const welcome = channels.find((c) => c.type === 0 && c.name === 'welcome');
const startHere = channels.find((c) => c.type === 0 && c.name === 'start-here');
if (!welcome) { console.error('No #welcome channel — run setup.mjs first.'); process.exit(1); }

if (startHere) {
  await api('POST', `/channels/${startHere.id}/messages`, { content: RULES });
  console.log('Rules posted to #start-here');
}

await api('POST', `/channels/${welcome.id}/messages`, {
  content: GATE,
  components: [
    {
      type: 1,
      components: [
        { type: 2, style: 3, label: 'I agree to the rules — let me in', custom_id: 'agree_rules' },
        { type: 2, style: 2, label: 'Add me to the launch list', custom_id: 'newsletter_optin' },
      ],
    },
  ],
});
console.log('Gate message with buttons posted to #welcome. Press your own agree button to get Crew.');
