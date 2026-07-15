# SyncPulse

A daily project tracker PWA — touch every project, every day. No exceptions.

- **Local-first data.** Your projects live on your device (localStorage, mirrored to IndexedDB for the service worker). The optional push backend never sees them.
- **Installable PWA.** Add it to your home screen on mobile (or install from the address bar on desktop). Works offline.
- **Real background notifications.** With Web Push configured (see below), reminders about untouched ("cold") projects arrive **even when the app is fully closed**, including on installed iOS PWAs. Without it, an in-app timer still nudges you while the app is open.

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

> PWA install and notifications require HTTPS, which Vercel provides by default.

## Background notifications (Web Push)

Notifications that fire while the app is **closed** need Web Push — the only web
API that can wake a closed app (including installed iOS PWAs on 16.4+). The design
is privacy-preserving: the server sends a **content-less "check now" ping**, and
your device's service worker reads its own local snapshot to decide what to show.
Project data never leaves your device — the server only stores opaque push tokens.

### One-time setup on Vercel

1. **Add a subscription store.** In your Vercel project → **Storage** → create a
   **KV / Upstash Redis** database and connect it. This injects `KV_REST_API_URL`
   and `KV_REST_API_TOKEN` automatically. (Or set `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN` from an Upstash database directly.)
2. **Set environment variables** (Project → Settings → Environment Variables):
   - `VAPID_PRIVATE_KEY` — the private key (ask the deployer, or regenerate a pair
     with `npx web-push generate-vapid-keys` and also set `VITE_VAPID_PUBLIC_KEY`).
   - `VAPID_SUBJECT` — e.g. `mailto:you@example.com`.
   - `CRON_SECRET` — any long random string; protects the send endpoint.
3. **Redeploy.** `vercel.json` already registers a daily Vercel Cron hitting
   `/api/send`, which authenticates with `CRON_SECRET` automatically.

### More frequent reminders

Vercel's Hobby plan runs cron **once per day**. For hourly (or finer) reminders,
point a free external scheduler such as [cron-job.org](https://cron-job.org) at:

```
https://YOUR-APP.vercel.app/api/send?key=YOUR_CRON_SECRET
```

The service worker de-duplicates: it never notifies more often than the interval
you pick in the app's settings, no matter how often the cron pings.

### How to use it

Open the app, enable notifications (the bell), and allow the browser prompt. On
iOS you must **Add to Home Screen first**, then enable notifications from the
installed app. That's it — the device is now subscribed.

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
