# SyncPulse

A daily project tracker PWA — touch every project, every day. No exceptions.

- **No backend.** All data is stored locally on your device (localStorage, mirrored to IndexedDB for the service worker).
- **Installable PWA.** Add it to your home screen on mobile (or install from the address bar on desktop). Works offline.
- **Notifications.** Reminders about untouched ("cold") projects fire through the service worker. On Chromium/Android, periodic background sync lets reminders fire even when the app is closed; elsewhere an in-app timer covers reminders while the app is open.

## Run locally

```bash
npm install
npm run dev
```

The service worker is only registered in production builds. To test PWA install/offline/notifications locally:

```bash
npm run build
npm run preview
```

## Deploy to Vercel

The repo is ready to deploy as-is:

1. Push to a Git repository.
2. Import the repo at [vercel.com/new](https://vercel.com/new) — Vercel auto-detects Vite (`npm run build`, output `dist/`).
3. Done. `vercel.json` handles SPA rewrites and service-worker cache headers.

Or from the CLI: `npx vercel`.

> Notifications and PWA install require HTTPS, which Vercel provides by default.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## Data

Everything lives in the browser's local storage under the `syncpulse:` keys. Clearing site data resets the app. There is no account and no server — each device keeps its own data.
