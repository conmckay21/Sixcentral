/**
 * SixCentral gate verifier. Prints exactly what a brand-new joiner
 * (@everyone, no roles) can see, so you never have to guess.
 *
 * Run:  DISCORD_BOT_TOKEN=... DISCORD_GUILD_ID=... node discord/verify-gate.mjs
 */
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
if (!TOKEN || !GUILD) {
  console.error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID.');
  process.exit(1);
}
const API = 'https://discord.com/api/v10';
const H = { Authorization: `Bot ${TOKEN}` };
const VIEW = 1024n; // VIEW_CHANNEL

const guild = await (await fetch(`${API}/guilds/${GUILD}`, { headers: H })).json();
const roles = await (await fetch(`${API}/guilds/${GUILD}/roles`, { headers: H })).json();
const channels = await (await fetch(`${API}/guilds/${GUILD}/channels`, { headers: H })).json();

const everyone = roles.find((r) => r.id === GUILD);
const basePerms = BigInt(everyone.permissions);
const byId = Object.fromEntries(channels.map((c) => [c.id, c]));

function everyoneCanView(ch) {
  let allow = 0n, deny = 0n;
  const parent = ch.parent_id ? byId[ch.parent_id] : null;
  for (const holder of [parent, ch]) {
    if (!holder) continue;
    const ow = (holder.permission_overwrites || []).find((o) => o.id === GUILD);
    if (ow) {
      deny = (deny & ~BigInt(ow.allow)) | BigInt(ow.deny);
      allow = (allow & ~BigInt(ow.deny)) | BigInt(ow.allow);
    }
  }
  let perms = basePerms;
  perms &= ~deny;
  perms |= allow;
  return (perms & VIEW) === VIEW;
}

const cats = channels.filter((c) => c.type === 4).sort((a, b) => a.position - b.position);
const rest = channels.filter((c) => c.type !== 4);
const visible = [];

console.log(`\nGuild: ${guild.name}`);
console.log(`Community features: ${guild.features?.includes('COMMUNITY') ? 'ON (check onboarding!)' : 'off'}`);
const sys = guild.system_channel_id ? byId[guild.system_channel_id]?.name : 'none';
console.log(`System messages (join notices) land in: #${sys}\n`);

for (const cat of [...cats, null]) {
  const kids = rest
    .filter((c) => (cat ? c.parent_id === cat.id : !c.parent_id))
    .sort((a, b) => a.position - b.position);
  if (!kids.length) continue;
  console.log(cat ? `▸ ${cat.name}` : '▸ (no category)');
  for (const ch of kids) {
    const v = everyoneCanView(ch);
    if (v) visible.push(ch.name);
    console.log(`   ${v ? '👁  VISIBLE to new joiners' : '🔒 hidden'}   #${ch.name}`);
  }
}

console.log('\n============ VERDICT ============');
if (visible.length === 1 && visible[0] === 'welcome') {
  console.log('✓ Gate is correct: a new joiner sees only #welcome.');
} else if (visible.length === 0) {
  console.log('✗ New joiners see NOTHING. #welcome needs an @everyone VIEW allow.');
} else {
  console.log(`✗ New joiners can see: ${visible.map((v) => '#' + v).join(', ')}`);
  console.log('  Expected: only #welcome. Fix the @everyone overwrites on the leaks,');
  console.log('  or re-run: node discord/setup.mjs');
}
if (guild.features?.includes('COMMUNITY')) {
  console.log('\nNote: Community is ON. Server Settings → Onboarding can force channels');
  console.log('visible to everyone regardless of overwrites. If the verdict above is');
  console.log('clean but joiners still see extra rooms, disable onboarding default channels.');
}
if (sys !== 'welcome') {
  console.log(`\nTip: set System Messages Channel to #welcome (currently #${sys}) so the`);
  console.log('"just joined" notice lands where the gate button is.');
}
console.log('');
