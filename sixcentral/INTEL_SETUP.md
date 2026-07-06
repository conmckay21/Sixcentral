# Intel Desk - setup

A staff-only editorial desk that scans the web for GTA signal once a day, clusters
each story, counts how many outlets carry it, scores it, and ranks it. You read the
desk, hit Copy brief on anything worth writing, and paste that into chat to build the
article. Confirmed over rumour, front and centre.

No new npm dependencies. The RSS parser is hand-rolled and everything else uses native
fetch plus the Supabase client you already have.

## What is in this drop

```
sixcentral/
  web/lib/intel/rss.ts             RSS and Atom parser, zero deps
  web/lib/intel/sources.ts         Google News, press feeds, Reddit, YouTube
  web/lib/intel/engine.ts          clustering, spread count, tiering, scoring
  web/lib/intel/supabaseAdmin.ts   service-role writer, preserves your edits
  web/app/api/intel-scan/route.ts  the daily cron endpoint
  web/app/staff/intel/page.tsx     the dashboard at /staff/intel
  supabase/migrations/20260706_intel_scan.sql   tables plus staff-only RLS
  supabase/seed_intel_20260706.sql              todays 18 stories, ranked
  supabase/build_seed_intel.py                  regenerates the seed
  vercel.json                      the cron schedule
```

## Step 1 - environment variables

Add these in Vercel (Project Settings, Environment Variables) and in web/.env.local for
local runs. Two you already have, two to add, one optional.

```
NEXT_PUBLIC_SUPABASE_URL          already set
NEXT_PUBLIC_SUPABASE_ANON_KEY     already set
SUPABASE_SERVICE_ROLE_KEY         add this, server only, never exposed to the client
CRON_SECRET                       add this, any long random string
YOUTUBE_API_KEY                   optional, YouTube is skipped cleanly if absent
```

Vercel automatically sends CRON_SECRET to the cron endpoint as an Authorization Bearer
header, so setting it is all that is needed to lock the route down.

## Step 2 - apply the database changes

Easiest path is the Supabase SQL editor. Open the project, paste the migration, run it,
then paste the seed and run it. Order matters, migration first.

```
supabase/migrations/20260706_intel_scan.sql
supabase/seed_intel_20260706.sql
```

Or via the CLI if you prefer:

```
supabase db push
```

The migration is safe to run more than once. It also adds profiles.is_staff if it is not
already there, matching your map bypass, so nothing breaks if it exists.

## Step 3 - deploy

Push the repo and let Vercel build. If you already have a vercel.json, do not overwrite
it, merge the crons array from this one into yours. The schedule is 0 11 star star star,
which is 11:00 UTC, that is noon UK during BST. Vercel cron runs on UTC, so when the
clocks change in autumn shift it to 0 12 star star star to keep it at midday.

## Verify

Trigger the scan by hand and watch it return counts:

```
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://sixcentral.co.uk/api/intel-scan
```

You should get JSON with ok true and inserted or updated counts. Then load the dashboard
while signed in as a staff account:

```
https://sixcentral.co.uk/staff/intel
```

You will already see the 18 seeded stories ranked. After the first live scan runs, fresh
stories join them.

## Three things to check for your setup

1. Router. This assumes the App Router, which your repo uses (web/app, web/lib). No change
   needed. If any file ever needs Pages Router, only route.ts moves.
2. Staff gate. The dashboard reads profiles.is_staff through the browser Supabase client,
   the same flag your map bypass uses. Real security is the row level policy, not the page,
   so a non-staff visitor gets zero rows even if they reach the URL. If your gate ever keys
   off a different helper, it is a one-line swap in page.tsx.
3. vercel.json. Merge, do not replace, if you already have one.

## Getting to the desk (staff link)

The desk lives at /staff/intel and is deliberately unlinked, staff only. To make it
discoverable without typing the URL, drop the StaffIntelLink component into your logged
in UI. It self-checks is_staff and shows an Intel Desk link to staff only, nothing to
anyone else, so it is safe in shared layout.

The file is sixcentral/web/components/StaffIntelLink.tsx. Import it and place
StaffIntelLink in your header, nav or profile menu, adjusting the import path to your
alias if needed. That is the only manual edit to your own files.

A subdomain like intel.sixcentral.co.uk was considered and skipped for now. It is a
separate origin, so the Supabase browser session does not carry across from the main
site, you would have to sign in again there and wire its own auth redirects. The in-app
staff link is simpler and ships with this deploy. The subdomain stays available later if
the internal tooling grows.

## No duplicates

The desk hides anything an existing article already covers. It reads your published
articles table and matches each story on distinctive words, ignoring generic roundup
words so a living roundup does not suppress the whole desk. A covered story gets a
covered badge linking to the article and drops out of the default view. Show covered
flips them back on. When you publish a new article from the desk, matching stories fall
away on the next scan. You can also set a story to published or dismissed by hand.

Three seeded stories are already marked covered by your two live articles, the confirmed
roundup and the editions guide, which leaves 15 fresh.

## How the ranking works

Two scores per story. Strength is how much to trust the claim. Rank is how much it deserves
your attention now, and it is the sort order.

```
strength = tier base (official 45, press 32, community 18, unverified 8)
           plus 20 if corroborated
           plus 1.5 per outlet up to 10 outlets

rank     = strength times 0.35
           plus spread times 0.30   (more outlets carrying it, higher)
           plus recency times 0.25  (fresher, higher)
           plus a category nudge     (debunk plus 8, controversy plus 6,
                                       confirmed plus 4, leak plus 2)
```

Debunks and controversy get a nudge on purpose, they are your differentiator content.
Pinned stories always sort to the top regardless of score.

The scan never overwrites your edits. Category, call, status, notes and pin are yours. When
a story reappears in a later scan it refreshes the machine fields (spread, sources, scores)
and leaves your columns alone.

## Sources in the free core

Google News RSS is the backbone and the spread counter, its outlet attribution is how one
story gets a count of how many places carry it. Reddit adds community pulse. A few press
feeds add bonus attribution. YouTube is optional behind YOUTUBE_API_KEY. X is not included,
its API is paid only. Facebook public post search is not available to anyone programmatically,
so it is out.

## The workflow

Open /staff/intel, scan top down, the highest rank is the most worth writing. Filter by
category, hide dismissed, search for a topic. On anything you want, hit Copy brief, it puts
a clean block on your clipboard with the summary, key points, every source with links, and
the suggested call. Paste that into chat and we turn it into the article. Set the story to
drafting so it drops out of your open view.
