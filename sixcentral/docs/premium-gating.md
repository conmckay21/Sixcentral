# SixCentral — Premium gating (the matrix + the pattern)

## The matrix

| | Free | Premium | Earned (rank perk) |
|---|---|---|---|
| All editorial (news, rumours, guides) | ✓ always — the growth engine is never paywalled | ✓ | — |
| Account, handle, avatar, Respect, leaderboard | ✓ | ✓ | — |
| Ads | shown | **removed** | removed |
| Tracker | up to **100 items**, 1 save slot | **unlimited**, multiple save slots | unlimited |
| Map | view + verified pins | **advanced filters, overlays, bulk tools** | ✓ |
| Progress export / early features / supporter badge | — | ✓ | ✓ |
| How it's granted | default | Stripe (web) / IAP (app) | free at **Lieutenant (3,000 Respect)** via rank trigger |

Pricing shape (locked earlier, final numbers at checkout build): annual + lifetime,
never cheap-monthly; anchored against MapGenie; in-app priced higher so the
store's 15% is passed on, web (Stripe) is the cheap path.

## The pattern (non-negotiable)

1. **`profiles.is_pro` is the single source of truth.** Users cannot write it —
   column grants (migration 0004) allow them handle + avatar_url only.
2. **Setters**, all server-side: the rank-perk trigger (live), the Stripe webhook
   (service role, next slice), app-store receipt validation (with the app),
   manual comps via service-role SQL.
3. **Enforcement lives in Postgres, never in UI.** The client may *read* is_pro
   to hide ads or grey out buttons, but every gated data operation is enforced
   by a trigger or policy. First live example: `enforce_free_tracking_cap()`
   (migration 0006) — free profiles hard-stop at 100 tracked items with error
   code `FREE_LIMIT`, which the UI catches and turns into the upgrade prompt.
4. **Ad gating** = don't render ad slots when is_pro (display concern only; no
   data to protect).
