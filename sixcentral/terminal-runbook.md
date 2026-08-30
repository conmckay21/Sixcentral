# SixCentral push build: terminal runbook

Read section 0 first. It is time critical.

---

## 0. Google Play deadline is tomorrow

From **31 August 2026**, Google Play rejects any new app or app update that does not
target **Android 16 (API level 36)**. That is tomorrow.

Expo SDK 54 ships targeting API 35. If that is still what your build resolves to, a
submission today goes through and a submission on Monday does not.

Check what you are actually targeting before you do anything else:

```
cd /Users/$USER/Sixcentral/sixcentral/app
npx expo config --type introspect | grep -i -A2 targetSdk
```

Three outcomes:

- **It says 36.** You are fine, carry on to section 1.
- **It says 35 and you can ship today.** Ship today. Do not stop to upgrade.
- **It says 35 and you cannot ship today.** Open Play Console, Policy status, find
  "App must target Android 16" and press **Request more time**. That extends you to
  1 November 2026. Do this before tomorrow, it is a form and it takes two minutes.

Forcing API 36 on SDK 54 is possible with the code below, but it is untested against
your dependency tree and is not something to attempt hours before a deadline. If you
have time to test properly:

```json
[
  "expo-build-properties",
  { "android": { "compileSdkVersion": 36, "targetSdkVersion": 36 } }
]
```

Do not ship that blind. Take the extension instead.

---

## 1. Unpack the files

```
cd /Users/$USER/Sixcentral
unzip -o /Users/$USER/Downloads/sixcentral-push.zip
```

That drops four files into place:

```
sixcentral/web/src/lib/push.ts
sixcentral/web/src/app/api/push/register/route.ts
sixcentral/web/src/app/api/publish-hooks/route.ts
sixcentral/app/src/hooks/usePushRegistration.ts
```

---

## 2. Install the native packages

```
cd /Users/$USER/Sixcentral/sixcentral/app
npx expo install expo-notifications expo-device
```

Then edit `app.json`. Add to `expo.plugins`:

```json
[
  "expo-notifications",
  { "icon": "./assets/notification-icon.png", "color": "#FF2E88" }
]
```

And under `expo.ios`:

```json
"infoPlist": { "UIBackgroundModes": ["remote-notification"] }
```

**The notification icon cannot be the VI mark.** Android renders it as a flat white
silhouette, so the pink V and cyan I both vanish. It needs its own asset: a white
shape on full transparency, 96x96 minimum. A plain white 6 works.

`appVersionSource` is `remote`, so do not touch `buildNumber` in `app.json`.

Typecheck before you go near a build:

```
cd /Users/$USER/Sixcentral/sixcentral/app && npx tsc --noEmit
cd /Users/$USER/Sixcentral/sixcentral/web && npx tsc --noEmit
```

---

## 3. Credentials

### 3a. iOS push key (APNs)

Apple Developer, Certificates Identifiers and Profiles, Keys, create a key with
**Apple Push Notifications service (APNs)** ticked. Download the `.p8`. Apple lets you
download it exactly once.

```
cd /Users/$USER/Sixcentral/sixcentral/app
eas credentials
```

Select iOS, production, then Push Notifications, then upload the `.p8`.

### 3b. The two Google keys, which are not the same thing

This is the bit that catches people out. You need **two separate service account JSON
files** and they do different jobs.

| | Purpose | Where it comes from |
|---|---|---|
| **FCM v1 key** | Delivering push to Android devices | Firebase console, Project settings, Service accounts, Generate new private key |
| **Play Developer API key** | Letting `eas submit` upload builds | Google Cloud, IAM, Service Accounts, then invited into Play Console |

Using one where the other belongs is the single most common failure here. The FCM key
will not upload a build and the Play key will not send a notification.

**FCM v1, for sending:**

```
cd /Users/$USER/Sixcentral/sixcentral/app
eas credentials
```

Select Android, production, then **FCM V1 service account key**, upload the Firebase JSON.

Also confirm `google-services.json` exists and is referenced in `app.json` under
`expo.android.googleServicesFile`.

**Play Developer API, for submitting:**

1. Google Cloud Console, select the project linked to Play, APIs and Services, enable
   **Google Play Android Developer API**.
2. IAM and Admin, Service Accounts, create one, then Keys, Add key, JSON. Download it.
3. Play Console, Users and permissions, Invite new user, paste the service account
   email, grant **Release** permissions for the SixCentral app.
4. Save it somewhere outside the repo and point `eas.json` at it:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "/Users/YOURNAME/keys/sixcentral-play.json",
      "track": "internal"
    },
    "ios": {
      "appleId": "YOUR_APPLE_ID",
      "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
      "appleTeamId": "YOUR_TEAM_ID"
    }
  }
}
```

Never commit that JSON. Add the keys directory to `.gitignore` if it is anywhere near
the repo.

Verify the whole credential set before building:

```
eas credentials
```

---

## 4. Build

```
cd /Users/$USER/Sixcentral/sixcentral/app

eas build --platform ios --profile production
eas build --platform android --profile production
```

Or both at once:

```
eas build --platform all --profile production
```

Watch it:

```
eas build:list --limit 5
```

These are the first binaries that will contain both `expo-updates` and
`expo-notifications`, so this is also the build that finally makes OTA reachable.

---

## 5. Submit

```
cd /Users/$USER/Sixcentral/sixcentral/app

eas submit --platform ios --latest
eas submit --platform android --latest
```

Android goes to the `internal` track per the config above. Promote it in Play Console
once you have tested a notification on a real device. Change `track` to `production`
when you want `eas submit` to go straight there.

iOS lands in App Store Connect and still needs the release submitting manually.

---

## 6. Deploy the web side

The database trigger is already live and is currently getting a 404, because the
endpoint it calls does not exist yet. Deploying this fixes that.

```
cd /Users/$USER/Sixcentral/sixcentral/web
npx tsc --noEmit
git add -A
git commit -m "Add push notifications and publish webhook"
git push origin main
```

Then add these in Vercel, project settings, environment variables, production:

```
PUBLISH_HOOK_SECRET=d45vwwq4M-JjnPmzoSaLJ03WnoNdKUE2ni9nlnIMN70
INDEXNOW_KEY=523bf5d9133a4ea3a30abfd3b5e24053
```

`SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` should already be set.

Adding env vars does not redeploy on its own. Redeploy after saving them.

While you are in `next.config.js`, the three redirects still outstanding:

```js
async redirects() {
  return [
    { source: '/guides/weapons-compared',  destination: '/guides/weapons',  permanent: true },
    { source: '/guides/vehicles-compared', destination: '/guides/vehicles', permanent: true },
  ]
}
```

---

## 7. Verify

Endpoint is alive. 401 is the correct answer here, it means the route exists and is
rejecting an unauthenticated call:

```
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://sixcentral.co.uk/api/publish-hooks
```

Now fire a real one from the database:

```sql
select net.http_post(
  url := 'https://sixcentral.co.uk/api/publish-hooks',
  body := jsonb_build_object('kind','article','slug','zz-probe','title','Probe','kicker','Test','category','news'),
  headers := jsonb_build_object('Content-Type','application/json','x-sixcentral-secret','d45vwwq4M-JjnPmzoSaLJ03WnoNdKUE2ni9nlnIMN70')
);
```

Wait a few seconds, then:

```sql
select id, status_code from net._http_response order by id desc limit 3;
```

`200` means the round trip works. It was `404` before deploy.

Once the new binary is on a device and you have granted permission:

```sql
select platform, is_active, topic_news, topic_weekly, last_seen_at
from push_tokens order by created_at desc limit 5;
```

Send yourself a test without touching the site:

```
curl -s -X POST https://exp.host/--/api/v2/push/send \
  -H "Content-Type: application/json" \
  -d '[{"to":"ExponentPushToken[PASTE]","title":"SixCentral","body":"Test","sound":"default"}]'
```

Then the real thing: publish an article by SQL exactly as you normally do, and check:

```sql
select topic, title, recipients, delivered, failed, created_at
from push_sends order by created_at desc limit 5;
```

If nothing arrives, `publish_hook_log` records every trigger entry, the Vault read and
the queued request id.

---

## Order of play for today

1. Check targetSdk. Ship today or request the extension.
2. Unpack, install packages, make the notification icon, edit `app.json`.
3. APNs key and both Google service accounts.
4. `npx tsc --noEmit` on both.
5. Deploy web with the env vars, confirm the endpoint returns 401.
6. Build both platforms.
7. Submit both.
8. Test on a real device before promoting Android off the internal track.

Steps 3 and 5 can happen while the builds run.
