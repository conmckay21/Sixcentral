# SixCentral

The UK companion for **Grand Theft Auto VI** — guides, news, and an interactive tracker.
This repo is the working foundation: a runnable web app, the full Supabase schema, and the
shared design system the native app builds on.

---

## What's in here (and what runs today)

| Part | Status |
| --- | --- |
| `web/` — Next.js guides/news/SEO site | ✅ **Runs now**, `next build` passes, renders on mock content with zero config |
| `supabase/` — full schema + seed (reputation, tracker, content, clips) | ✅ Ready to apply |
| `shared/tokens.ts` — design tokens for web **and** the future Expo app | ✅ Source of truth |
| `apps/mobile` — Expo native app (tracker, map, clips) | ⏳ Next slice — needs your local Xcode/Android setup |

The web app deliberately runs on **mock data** until you add Supabase keys, so you can `npm run
dev` and see the whole site immediately.

---

## Target structure

Delivered flat for a clean first run; the intended monorepo shape:

```
sixcentral/
├── web/                    # Next.js — the guides/news site (SEO + discovery engine)   [here now]
├── apps/mobile/            # Expo (React Native) — the companion app                    [next]
├── shared/                 # design tokens + shared types, imported by both
└── supabase/               # migrations + seed (one backend, both front-ends)
```

Both front-ends talk to the **same Supabase backend** and share `shared/tokens.ts`. When you add
the Expo app, promote this to an npm/pnpm workspace so both packages import `shared` directly.

---

## Quick start (web)

```bash
cd web
npm install
cp .env.example .env.local     # optional — leave blank to use mock content
npm run dev                    # http://localhost:3000
```

That's it. You'll get the homepage (with a live launch countdown), the searchable/filterable
guides library, and every guide + news page.

### Wire up Supabase (when ready)

```bash
# 1. Create a NEW Supabase project (keep it separate from your other apps)
# 2. Apply the schema + seed:
supabase link --project-ref <your-ref>
supabase db push                       # runs supabase/migrations/0001_init.sql
psql "$DATABASE_URL" -f supabase/seed.sql   # or paste seed.sql into the SQL editor
# 3. Put the URL + anon key in web/.env.local
```

Then implement the Supabase branches in `web/lib/content.ts` (they're stubbed with the exact
queries commented in). The mock fallback stays as a safety net.

---

## The two Pro purchase paths (by design)

We sell Premium two ways, on purpose:

- **Web (Stripe)** — the cheaper price. You keep ~97%. This is the route to push people to via the
  site, newsletter and Discord.
- **In-app (StoreKit / Play Billing)** — a higher price to absorb the store cut (15% under the
  small-business programmes you'll qualify for, not 30%). `.env.example` and the schema's
  `profiles.is_pro` are set up for both; a `subscriptions` table + webhook flips `is_pro`.

UK anti-steering rules currently mean you **can't link to the cheaper web price from inside the iOS
app** — build both paths now; the CMA is expected to loosen this later in 2026.

---

## Architecture notes (why it stays cheap)

- **Static-first.** Content pages prerender and serve from the CDN edge — a traffic spike on cached
  pages is essentially free. This is your launch-day cost insurance.
- **Thin dynamic core.** Only genuinely per-user writes hit the database (progress, submissions,
  Pro status). Slow-changing data (pins, leaderboards, content) is cached, not queried per load.
- **Embed clips, don't host them.** The clip feed embeds YouTube (and TikTok/Medal); console/upload
  clips get routed to YouTube via the API. You store video IDs, not files. See
  `clip_submissions` — it holds the consent record, not the video.
- **The map is original artwork + crowdsourced data.** No third-party map/data. Pins are
  community-submitted (`map_pins`), start `pending`, and go `verified` on confirmation.

---

## Design system

`shared/tokens.ts` is the single source of truth for colours, fonts and radii.
- The web app mirrors them as CSS custom properties in `web/app/globals.css`.
- The Expo app will import `theme` from `shared/tokens.ts` directly.

Fonts: **Anton** (display), **Space Grotesk** (body), **Spline Sans Mono** (data/HUD).

---

## Roadmap — the remaining slices, in order

1. **Expo app skeleton** — 5 tabs (Home · Guides · Map · Clips · You) on this Supabase backend,
   importing `shared/tokens.ts`. Native app is what unlocks the console share-extension intake.
2. **Interactive map** — native map/canvas layer rendering `map_pins`; tap-to-find writes
   `user_progress`; confirm-pin calls `award_respect`. Highest-risk piece — prototype first.
3. **Guides ↔ tracker link** — use `guide_links` + `user_progress` to power "guides for what you're
   stuck on" and per-guide progress chips (currently placeholder in the web cards).
4. **Clips** — multi-route intake (console share / upload / link), YouTube Data API routing,
   `clip_submissions` consent capture, voting → Clip of the Month.
5. **Auth** — Supabase Auth + Discord OAuth → `profiles`; this lights up reputation everywhere.
6. **Payments** — Stripe (web) + StoreKit/Play Billing (in-app), two price points → `is_pro`.
7. **Content layer → Supabase** — implement the commented queries in `web/lib/content.ts`.

---

## Honest notes on what's stubbed

- Progress percentages and the guide "Tracked" chips are **placeholders** until auth + the app
  exist — they're wired to real fields, just not to a signed-in user yet.
- `lib/content.ts` currently returns mock content; the Supabase queries are written as comments.
- The Expo app isn't included because it needs your local native toolchain (Xcode / Android
  Studio) — it's the immediate next slice, on top of this exact backend.

---

*SixCentral is an independent fan resource, not affiliated with Rockstar Games or Take-Two
Interactive. All artwork is original.*
