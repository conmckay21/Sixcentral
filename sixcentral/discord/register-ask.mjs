/**
 * Registers the /ask command (the AI helper) on the guild, additively.
 * A single-command POST creates or updates just /ask and leaves /submit and
 * /rank untouched.
 *
 * Run (Node 18+):
 *   DISCORD_BOT_TOKEN=xxxx DISCORD_GUILD_ID=xxxx node discord/register-ask.mjs
 */

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
const APP_ID = '1522233114863341728';
if (!TOKEN || !GUILD) {
  console.error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID environment variables first.');
  process.exit(1);
}

const command = {
  name: 'ask',
  description: 'Ask the SixCentral helper a GTA 6 question (confirmed facts only)',
  options: [
    {
      type: 3, // STRING
      name: 'question',
      description: 'What do you want to know?',
      required: true,
      max_length: 300,
    },
  ],
};

const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD}/commands`, {
  method: 'POST',
  headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(command),
});

if (!res.ok) {
  console.error(`Failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log('Registered /ask - live in the server now.');
