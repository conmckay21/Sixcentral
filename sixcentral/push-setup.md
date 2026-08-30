# SixCentral push notifications: setup

Everything below is ready. The only hard blocker is that `expo-notifications` is a
native module, so **push cannot reach the currently installed App Store binary**.
It works from the next iOS and Android builds onwards, same as OTA.

---

## 1. Files and where they go

| File | Destination |
|---|---|
| `lib_push.ts` | `web/src/lib/push.ts` |
| `route_register.ts` | `web/src/app/api/push/register/route.ts` |
| `usePushRegistration.ts` | `app/src/hooks/usePushRegistration.ts` |

The database migration is already applied to Supabase: tables `push_tokens` and
`push_sends`, RLS disabled on both (internal tables, service role only).

---

## 2. Credentials, do this first

These have external dependencies and will hold everything else up.

**iOS**
1. Apple Developer, Certificates, Identifiers and Profiles, Keys.
2. Create a key with Apple Push Notifications service (APNs) enabled.
3. Download the `.p8`. Apple only lets you download it once.
4. `eas credentials`, select iOS, production, Push Notifications, upload the `.p8`.

**Android**
1. Firebase console, create or open the project, Project settings, Service accounts.
2. Generate a new private key, which downloads a JSON file.
3. `eas credentials`, select Android, production, upload the FCM v1 service account JSON.
4. Make sure `google-services.json` is present and referenced in `app.json`.

---

## 3. App changes

```
npx expo install expo-notifications expo-device
```

Add to `app.json` under `expo.plugins`:

```json
[
  "expo-notifications",
  {
    "icon": "./assets/notification-icon.png",
    "color": "#FF2E88"
  }
]
```

The notification icon must be a white-on-transparent PNG. Android renders it as a
silhouette, so the VI mark will not work here. A simple white "6" is the safe option.

Also add to `app.json`:

```json
"ios": {
  "infoPlist": {
    "UIBackgroundModes": ["remote-notification"]
  }
}
```

Note: `appVersionSource` is `remote`, so do not hand-edit `buildNumber`.

---

## 4. Wiring the prompt

Do **not** call `registerForPush()` on first launch. iOS only permits one prompt, and
asking on the splash screen wastes it. Put it behind a button on the article screen or
in settings, shown after a couple of reads.

```tsx
const { registerForPush } = usePushRegistration(session?.access_token)
// then, from a button:
const granted = await registerForPush()
```

---

## 5. Hooking it to publishing

In the existing publish route, alongside the IndexNow ping:

```ts
import { sendPush } from '@/lib/push'

await sendPush({
  topic: 'news',
  title: article.kicker ?? 'SixCentral',
  body: article.title,
  url: `https://sixcentral.co.uk/news/${article.slug}`,
  articleSlug: article.slug,
})
```

`push_sends` has a unique index on `(article_slug, topic)`, so republishing or a
double-fire cannot double-notify. The second call returns `{ skipped: true }`.

**Important:** articles inserted straight into Supabase via SQL bypass this route
entirely, exactly as they bypass IndexNow. Anything published that way needs a manual
send.

For the Thursday GTA Online weekly, use `topic: 'weekly'` and no `articleSlug`.

---

## 6. Topics

Three channels, stored per token so people can take one without the others.

| Topic | Column | Default | Use for |
|---|---|---|---|
| `news` | `topic_news` | on | Major GTA 6 news |
| `weekly` | `topic_weekly` | off | Thursday GTA Online update |
| `clips` | `topic_clips` | off | Community and clip activity |

The register route only writes a topic column when the app explicitly sends that field,
so a cold-start refresh never silently resets someone's preferences.

---

## 7. Testing before you ship

Send a test to a single device without touching the site:

```
curl -s -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '[{"to":"ExponentPushToken[xxxx]","title":"SixCentral","body":"Test","sound":"default"}]'
```

Then check the token landed:

```sql
select platform, is_active, topic_news, topic_weekly, last_seen_at
from push_tokens order by created_at desc limit 5;
```

And after a real send:

```sql
select topic, title, recipients, delivered, failed, created_at
from push_sends order by created_at desc limit 10;
```

---

## 8. Housekeeping

`DeviceNotRegistered` tickets are handled automatically: the sender flags those tokens
`is_active = false` so uninstalled devices stop counting against your recipient totals.

Worth running occasionally:

```sql
update push_tokens set is_active = false
where is_active = true and last_seen_at < now() - interval '90 days';
```

---

# Part 2: automatic sending, without changing how you publish

You publish by inserting rows into Supabase. That bypasses the publish route, so it
bypassed both IndexNow and push. Rather than change that workflow, the database now
does the notifying itself.

## What is already live in Supabase

- Extensions `pg_net`, `pg_cron` and `supabase_vault` are enabled.
- Vault holds two secrets: `publish_hook_secret` and `site_url`.
- Function `public.notify_on_publish()` and triggers `articles_notify_on_publish`
  and `guides_notify_on_publish`.
- Table `publish_hook_log` for debugging. Safe to truncate.

The trigger fires an async HTTP POST to `/api/publish-hooks` and only on a genuine
transition into published. Verified behaviour:

| Action | Fires? |
|---|---|
| Insert with `published = false` | No |
| Update `reading_mins`, `body`, `excerpt` | No |
| Update `published` false to true | **Yes** |
| Touch `updated_at` on an already published row | No |
| Update `published` true to true | No |

So bulk maintenance, reading-time recalcs and body edits will never notify anyone.

## What you still need to deploy

Add `route_publish_hooks.ts` to `web/src/app/api/publish-hooks/route.ts`, plus these
Vercel environment variables:

```
PUBLISH_HOOK_SECRET=d45vwwq4M-JjnPmzoSaLJ03WnoNdKUE2ni9nlnIMN70
INDEXNOW_KEY=523bf5d9133a4ea3a30abfd3b5e24053
SUPABASE_SERVICE_ROLE_KEY=<already set>
```

`PUBLISH_HOOK_SECRET` must match the Vault value exactly. To rotate it later:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'publish_hook_secret'),
  'new-secret-value'
);
```

## Routing rules in the endpoint

- Guides are indexed but never pushed. They are evergreen and nobody wants an alert
  for a Bunker guide edit.
- Articles in the `online` category go to the `weekly` topic.
- Everything else goes to `news`.
- IndexNow fires for both kinds, which also closes the gap where SQL-published
  articles were never submitted to Bing.

## Confirming it works after deploy

The endpoint currently returns 404 because it does not exist yet. That is expected.
After deploying, publish something and check:

```sql
select id, status_code, created from net._http_response order by id desc limit 5;
```

`200` means the round trip is complete. Then:

```sql
select topic, title, recipients, delivered, failed from push_sends order by created_at desc limit 5;
```

If something looks wrong, re-enable logging by checking `publish_hook_log`, which
records every trigger entry, the Vault read and the queued request id.

## Manual send, if you ever need one

```sql
select net.http_post(
  url := 'https://sixcentral.co.uk/api/publish-hooks',
  body := jsonb_build_object('kind','article','slug','SLUG-HERE','title','TITLE','kicker','Confirmed','category','news'),
  headers := jsonb_build_object('Content-Type','application/json','x-sixcentral-secret','d45vwwq4M-JjnPmzoSaLJ03WnoNdKUE2ni9nlnIMN70')
);
```
