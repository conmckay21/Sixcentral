# Alerts card

Two new files, one patch.

- `app/src/components/AlertsCard.tsx` — new component
- `app/tsconfig.json` — replaced, now excludes `../web` so `npx tsc --noEmit`
  in the app stops reporting the two phantom `next/server` errors
- `apply-alerts-card.py` — patches your existing `(tabs)/index.tsx` in place,
  since I do not have a copy I can safely overwrite

Run from `~/Sixcentral`:

```
unzip -o ~/Downloads/sixcentral-alerts-card.zip
cd ~/Sixcentral/sixcentral/app
python3 ../apply-alerts-card.py "src/app/(tabs)/index.tsx"
npx tsc --noEmit
```

The typecheck should now be completely clean. Then:

```
cd ~/Sixcentral/sixcentral
git add -A && git commit -m "Add alerts card to news feed"
cd app && npx eas-cli@latest update --branch production --message "Add alerts card to news feed"
```

No build needed. Reaches every 1.3.0 install.
