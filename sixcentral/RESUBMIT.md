# SixCentral — 4.1(a) resubmission pack

Rejection: Guideline 4.1(a) Copycats, metadata contains content resembling GTA.
Apple counts the icon and the screenshots as metadata. Both carried the VI mark.
The app itself is untouched. Editorial content inside the app stays exactly as it is.

---

## 1. Icon

`brand/icons/` holds the replacement set. The mark is the SixCentral monogram,
pink S on cyan 6, brand palette unchanged.

| File | Target |
| --- | --- |
| `icon.png` | 1024x1024, opaque, no alpha, no rounded corners. iOS and App Store. |
| `adaptive-icon.png` | 1024x1024 transparent foreground, glyph inside the Android safe circle. |
| `splash-icon.png` | 1024x1024 transparent, generous margin. |
| `favicon.png` | 64x64. Web. |

Find where the current icons live, back them up, then swap:

```
cd ~/Sixcentral/sixcentral/app
grep -nE "icon|favicon|foregroundImage" app.json
mkdir -p assets/_backup && cp assets/icon.png assets/adaptive-icon.png assets/splash-icon.png assets/_backup/ 2>/dev/null || true
cp ~/Sixcentral/sixcentral/brand/icons/icon.png assets/icon.png
cp ~/Sixcentral/sixcentral/brand/icons/adaptive-icon.png assets/adaptive-icon.png
cp ~/Sixcentral/sixcentral/brand/icons/splash-icon.png assets/splash-icon.png
cp ~/Sixcentral/sixcentral/brand/icons/favicon.png assets/favicon.png
```

If `grep` shows different filenames, keep the filenames and overwrite those instead.
Confirm `android.adaptiveIcon.backgroundColor` is `#0B0810`.

Bump the build number in `app.json`:

```
"ios": { "buildNumber": "7" }
```

## 2. Build and submit

Never bare npm install in this directory.

```
cd ~/Sixcentral/sixcentral/app
npm ci
npx eas-cli@latest build --profile production --platform ios
npx eas-cli@latest submit --platform ios --latest
```

Fifteen to twenty-five minutes to build, then Apple processes for up to an hour.

## 3. Screenshots

Home and Map are dropped. Four remain. For each one, replace the VI in the frame
footer with `brand/screenshots/wordmark-footer.png` and re-export at 1284x2778.

Before you upload, read every word visible inside the phone. Guide titles, article
headlines, collectible names, empty states. If the game is named anywhere in the
pixels, that frame does not ship.

Captions are in `store/captions.txt`.

## 4. Text metadata

`store/metadata-fields.txt` has every field, ready to paste.

Apple's API was returning 500s. When it recovers you can push from the terminal
instead of fighting the web UI:

```
cd ~/Sixcentral/sixcentral/app
npx eas-cli@latest metadata:pull
```

That writes `store.config.json` populated from the live listing. Replace subtitle,
keywords, promoText and description with the strings from `metadata-fields.txt`,
then:

```
npx eas-cli@latest metadata:push
```

Screenshots and review notes are not covered by metadata push. Those stay manual.

## 5. Submit

- App Review Information notes: paste `store/review-notes.txt`
- Version Release: Manually release this version
- Attach build 7
- Submit for Review
- Then reply to the rejection message with `store/apple-reply.txt`

## Verify before you press submit

- [ ] App icon on the home screen is the S6 monogram, not the VI
- [ ] Four screenshots uploaded, zero named marks in any frame
- [ ] Footer of every frame is the SIXCENTRAL wordmark
- [ ] Subtitle 28 chars, keywords 88 chars, promo text under 170
- [ ] Description ends with the non-affiliation line
- [ ] Copyright field reads 2026 SixCentral
- [ ] Build 7 attached, manual release set

## Not in scope today

The site, Discord and social avatars still carry the VI. Apple has no say over those.
Swap them when you have a quiet hour, before you have a userbase that knows the old one.
