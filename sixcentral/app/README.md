# SixCentral app (Phase 1 scaffold)

Expo SDK 57 · expo-router · Supabase · bundle ID `uk.co.sixcentral.app`

## Run it
1. `cp .env.example .env` and paste the anon key (same values as the Vercel env).
2. `npm install`
3. `npx expo start` then press `i` for the iOS simulator, `a` for Android,
   or scan the QR with Expo Go on your phone (Phase 1 has no native modules yet,
   so Expo Go works; the share extension in Phase 2 moves us to a dev build).

## What is in Phase 1
Home: live launch countdown + top five of The Come-Up.
Clips: the real merit-ranked feed, read-only.
Progress: your rank, Respect and the bar to the next rank.
Profile: sign in / create account (same accounts as the website), identity card, sign out.
Map: Phase 3 placeholder.

## Next phases
2: console share intake (share extension, dev build), clip submit + votes.
3: the Leonida map + tracker. 4: RevenueCat IAP. 5: push. 6: TestFlight/Play.
