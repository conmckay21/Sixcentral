# SixCentral Discord — setup

## One-time: create the application (Developer Portal)
1. discord.com/developers/applications → **New Application** → name: `SixCentral`
2. **Bot** tab → note the **TOKEN** (Reset Token → copy). Treat like a password:
   it goes in env vars only — never in chat, never in git.
3. **General Information** → copy the **Application ID** (this one is public-safe).
4. Invite the bot to the server — paste this URL in a browser, replacing APP_ID:

   https://discord.com/api/oauth2/authorize?client_id=APP_ID&scope=bot%20applications.commands&permissions=268520528

   (Permissions: manage roles + channels, send/read messages, embeds — what the
   setup script and the future bot need, nothing more.)
5. In Discord: Settings → Advanced → **Developer Mode ON**, then right-click the
   server icon → **Copy Server ID**.

## Run the structure build
From the repo root, Node 18+:

    DISCORD_BOT_TOKEN=paste_token_here DISCORD_GUILD_ID=paste_server_id_here node discord/setup.mjs

Idempotent — re-run freely; it skips anything that already exists by name.
If channels from the manual era duplicate the plan (e.g. an old #general),
delete the manual ones and re-run, or keep them and delete the script's.

## After it runs
- Assign yourself the **Moderator** role (Server Settings → Members).
- The rank roles carry no permissions by design — they are earned status,
  synced from site Respect by the bot (next build slice).
- Set the invite used on the website to **never expire** if not already done.

## Bot go-live (after the structure build)
1. Push update 10; add the env vars below in Vercel → Settings → Environment
   Variables (Production) **before** pushing so one deploy carries both.
2. `node discord/register-commands.mjs` (same two env vars as setup).
3. Developer Portal → General Information → **Interactions Endpoint URL** →
   `https://sixcentral.co.uk/api/discord/interactions` → Save. Discord fires a
   signed PING at it; saving succeeds only if the deploy is live and verifying.
4. Discord sign-in: Portal → OAuth2 → add redirect
   `https://kodkbbuuhkoifnggkrjx.supabase.co/auth/v1/callback`, copy the Client
   Secret → Supabase → Authentication → Providers → Discord → enable with the
   App ID + secret. Then set `NEXT_PUBLIC_DISCORD_AUTH_READY=true` in Vercel
   env and redeploy — the site's Discord button appears.

Vercel env vars: DISCORD_BOT_TOKEN (portal), DISCORD_GUILD_ID,
DISCORD_WEBHOOK_SECRET + CRON_SECRET (generated — password manager),
SUPABASE_SERVICE_ROLE_KEY (Supabase → Settings → API keys),
NEXT_PUBLIC_DISCORD_AUTH_READY (step 4).
