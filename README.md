# StarCenter Times

An unofficial schedule finder for the Dallas Stars StarCenter rinks. It puts
every public skate, stick & puck, drop-in, and other ice session across the
eight Dallas-area StarCenters on one timeline. It's built with Expo / React
Native and ships as an installable PWA.

## Updating the schedule

```powershell
.\Update-Schedules.ps1
```

This scrapes each rink's public schedule page plus the activity catalog, then
writes `schedule-data.json` with only the fields the app reads. Raw pages are
cached in `cache/` for 24 hours (`-ForceRefresh` bypasses the cache). Use
`-WriteFullData` to also write the full scrape, including match diagnostics,
to `cache/schedule-data.full.json` for debugging.

The schedule data is bundled into the JavaScript build. After updating it,
rebuild and redeploy; there's no backend or remote schedule API.

## Web build

```sh
npm run web:build     # icons -> expo export -> service worker, into dist/
npm run web:preview   # serve dist/ locally
npm run netlify:deploy
```

The app uses Dallas Stars Victory Green (`#006847`) with a generated star logo.
`npm run web:icons` regenerates `assets/icon.png` and the 192/512px PWA icons
in `public/`.
