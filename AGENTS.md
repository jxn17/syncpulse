# AGENTS.md

## Project Context

SyncPulse is a client-only React (Vite) PWA for daily project tracking. There is no backend: all data is stored on-device via localStorage (see `src/api/storage.js`), mirrored to IndexedDB so the service worker can read it for background notifications.

## Key Files

- `src/api/storage.js`: local storage layer (`db.entities.Project`, `db.entities.AppSettings`).
- `src/pages/Dashboard.jsx`: main (and only) page.
- `src/hooks/useNotifications.js`: notification permission, in-page reminder timer, Web Push subscribe.
- `src/lib/push.js`: Web Push client helpers (subscribe/unsubscribe).
- `api/send.js` + `api/subscribe.js` + `api/_redis.js`: Vercel serverless push backend. The cron sends a **content-less** trigger; `sw.js` decides what to show from the on-device snapshot, so project data never reaches the server.
- `public/sw.js`: service worker — offline cache + `push`/`periodicsync` background checks (`backgroundCheck`, quiet + interval de-duped).
- `public/manifest.json`: PWA manifest; icons in `public/icons/`.
- `vercel.json`: SPA rewrites + cache headers for deployment.

## Working Notes

- Modals are rendered via `createPortal` to `document.body` — the project cards have a hover `transform`, which would trap `position: fixed` overlays. Keep new overlays portaled.
- The service worker is registered only in production builds (`npm run build && npm run preview` to test PWA behavior).
- Run `npm run lint` and `npm run build` before finishing code changes.
