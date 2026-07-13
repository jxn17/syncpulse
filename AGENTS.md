# AGENTS.md

## Project Context

SyncPulse is a client-only React (Vite) PWA for daily project tracking. There is no backend: all data is stored on-device via localStorage (see `src/api/storage.js`), mirrored to IndexedDB so the service worker can read it for background notifications.

## Key Files

- `src/api/storage.js`: local storage layer (`db.entities.Project`, `db.entities.AppSettings`).
- `src/pages/Dashboard.jsx`: main (and only) page.
- `src/hooks/useNotifications.js`: notification permission, reminder timer, periodic background sync.
- `public/sw.js`: service worker — offline cache + background notification checks.
- `public/manifest.json`: PWA manifest; icons in `public/icons/`.
- `vercel.json`: SPA rewrites + cache headers for deployment.

## Working Notes

- Modals are rendered via `createPortal` to `document.body` — the project cards have a hover `transform`, which would trap `position: fixed` overlays. Keep new overlays portaled.
- The service worker is registered only in production builds (`npm run build && npm run preview` to test PWA behavior).
- Run `npm run lint` and `npm run build` before finishing code changes.
