/* SyncPulse service worker: offline app shell + notifications. */

const CACHE = "syncpulse-v3";
const APP_SHELL = ["/", "/manifest.json", "/favicon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  // Navigations: network first, cached shell as offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Static assets (Vite output is content-hashed): cache first.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
    )
  );
});

/* ── Notifications ─────────────────────────────────────────────── */

// The page mirrors its localStorage data into IndexedDB so this worker can
// check project state even when no tab is open.
function readSnapshot() {
  return new Promise((resolve) => {
    const req = indexedDB.open("syncpulse", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const get = db.transaction("kv", "readonly").objectStore("kv").get("snapshot");
        get.onsuccess = () => { resolve(get.result || null); db.close(); };
        get.onerror = () => { resolve(null); db.close(); };
      } catch {
        resolve(null);
        db.close();
      }
    };
  });
}

// Small key/value helpers on the same IndexedDB store, used to de-duplicate
// push-triggered notifications (the cron may ping more often than the user's
// chosen interval).
function kvGet(key) {
  return new Promise((resolve) => {
    const req = indexedDB.open("syncpulse", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const get = db.transaction("kv", "readonly").objectStore("kv").get(key);
        get.onsuccess = () => { resolve(get.result ?? null); db.close(); };
        get.onerror = () => { resolve(null); db.close(); };
      } catch {
        resolve(null);
        db.close();
      }
    };
  });
}

function kvSet(key, value) {
  return new Promise((resolve) => {
    const req = indexedDB.open("syncpulse", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("kv");
    req.onerror = () => resolve(false);
    req.onsuccess = () => {
      const db = req.result;
      try {
        const tx = db.transaction("kv", "readwrite");
        tx.objectStore("kv").put(value, key);
        tx.oncomplete = () => { resolve(true); db.close(); };
        tx.onabort = () => { resolve(false); db.close(); };
      } catch {
        resolve(false);
        db.close();
      }
    };
  });
}

function touchedToday(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function notify(title, body, tag) {
  return self.registration.showNotification(title, {
    body,
    tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: "/" },
  });
}

// Background check for push / periodic sync. Unlike checkProjects (used by the
// open app), this stays quiet: it only notifies when something actually needs a
// touch, and never more often than the user's chosen interval — so a cron that
// pings every hour won't nag someone who set a 3-hour reminder or already
// touched everything.
async function backgroundCheck(options) {
  const skipInterval = options && options.skipInterval;
  const snap = await readSnapshot();
  if (!snap || !snap.projects || snap.projects.length === 0) return;
  if (snap.settings && snap.settings.notifications_enabled === false) return;

  // The interval gate: skipped for Web Push (the server already enforces the
  // user's interval), applied for periodic sync (which has no server gate).
  if (!skipInterval) {
    const intervalMs = ((snap.settings && snap.settings.notify_interval_minutes) || 30) * 60 * 1000;
    const last = (await kvGet("last_notified_at")) || 0;
    // 0.9 factor so an interval-aligned tick isn't skipped by a few seconds of jitter.
    if (Date.now() - last < intervalMs * 0.9) return;
  }

  const untouched = snap.projects.filter((p) => !touchedToday(p.last_touched));
  const focused = snap.projects.find((p) => p.is_focused);

  let shown = false;
  if (focused) {
    const cold = untouched.filter((p) => p.id !== focused.id);
    if (cold.length > 0) {
      const names = cold.slice(0, 3).map((p) => p.name).join(", ");
      await notify(
        `🔒 Focus lock — ${cold.length} project${cold.length > 1 ? "s" : ""} need a touch`,
        `Still in ${focused.name}. Don't forget: ${names}${cold.length > 3 ? ` +${cold.length - 3} more` : ""}`,
        "cold-projects"
      );
      shown = true;
    }
  } else if (untouched.length > 0) {
    const names = untouched.slice(0, 3).map((p) => p.name).join(", ");
    await notify(
      `🧊 ${untouched.length} project${untouched.length > 1 ? "s" : ""} not touched today`,
      names + (untouched.length > 3 ? ` +${untouched.length - 3} more` : ""),
      "cold-projects"
    );
    shown = true;
  }

  if (shown) await kvSet("last_notified_at", Date.now());
}

// Web Push: delivered even when the app is fully closed (incl. installed iOS
// PWAs). The payload is a content-less trigger — all "what to show" logic is
// on-device, reading the local snapshot above.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  // Test trigger (/api/send?test=1): always show a notification, bypassing the
  // cold-project and interval checks, so delivery can be verified on demand.
  if (data.test) {
    event.waitUntil(
      notify(
        "🔔 SyncPulse test push",
        "Seeing this with the app closed means background notifications work.",
        "test-push"
      )
    );
    return;
  }
  // Server already gated by the user's interval, so don't re-throttle here.
  event.waitUntil(backgroundCheck({ skipInterval: true }));
});

// Fires while the app is closed on browsers that support it (Chromium/Android).
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "syncpulse-check") {
    event.waitUntil(backgroundCheck());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(event.data.title, event.data.options || {});
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => "focus" in w);
      return open ? open.focus() : self.clients.openWindow(url);
    })
  );
});
