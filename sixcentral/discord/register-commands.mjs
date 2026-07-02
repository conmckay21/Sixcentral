/**
 * Registers the SixCentral slash commands on the server (guild-scoped =
 * live instantly). Re-run any time the definitions change.
 *
 *   DISCORD_BOT_TOKEN=xxxx DISCORD_GUILD_ID=xxxx node discord/register-commands.mjs
 */
const APP_ID = '1522233114863341728';
const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD = process.env.DISCORD_GUILD_ID;
if (!TOKEN || !GUILD) {
  console.error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID first.');
  process.exit(1);
}

const commands = [
  {
    name: 'submit',
    description: 'Submit intel or a correction for verification — Respect when confirmed',
    options: [
      {
        type: 3, name: 'type', description: 'What is it?', required: true,
        choices: [
          { name: 'Factual correction', value: 'verified_correction' },
          { name: 'Intel / tip', value: 'intel' },
        ],
      },
      { type: 3, name: 'details', description: 'What do you know, and how do you know it?', required: true, max_length: 1500 },
      { type: 3, name: 'source', description: 'Source link (strongly recommended)', required: false, max_length: 300 },
      { type: 3, name: 'about', description: 'Which article or topic is it about?', required: false, max_length: 200 },
    ],
  },
  {
    name: 'rank',
    description: 'Your Come-Up card — rank, Respect, and the road to the next tier',
  },
];

const res = await fetch(`https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD}/commands`, {
  method: 'PUT',
  headers: { Authorization: `Bot ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(commands),
});
if (!res.ok) {
  console.error(`Failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
console.log('Commands registered: /submit, /rank — live in the server now.');
