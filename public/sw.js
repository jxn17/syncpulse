/* SyncPulse service worker: offline app shell + notifications. */

const CACHE = "syncpulse-v1";
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

async function checkProjects() {
  const snap = await readSnapshot();
  if (!snap || !snap.projects || snap.projects.length === 0) return;
  if (snap.settings && snap.settings.notifications_enabled === false) return;

  const untouched = snap.projects.filter((p) => !touchedToday(p.last_touched));
  const focused = snap.projects.find((p) => p.is_focused);

  if (focused) {
    const cold = untouched.filter((p) => p.id !== focused.id);
    if (cold.length > 0) {
      const names = cold.slice(0, 3).map((p) => p.name).join(", ");
      return notify(
        `🔒 Focus lock — ${cold.length} project${cold.length > 1 ? "s" : ""} need a touch`,
        `Still in ${focused.name}. Don't forget: ${names}${cold.length > 3 ? ` +${cold.length - 3} more` : ""}`,
        "focus-lock"
      );
    }
    return notify(
      "✅ All projects touched today!",
      `Keep it up. You're in ${focused.name} — great focus.`,
      "all-good"
    );
  }

  if (untouched.length > 0) {
    const names = untouched.slice(0, 3).map((p) => p.name).join(", ");
    return notify(
      `🧊 ${untouched.length} project${untouched.length > 1 ? "s" : ""} not touched today`,
      names + (untouched.length > 3 ? ` +${untouched.length - 3} more` : ""),
      "cold-projects"
    );
  }

  return notify(
    `✅ All ${snap.projects.length} projects touched today!`,
    "You're on a roll. Keep the streak alive.",
    "all-done"
  );
}

// Fires while the app is closed on browsers that support it (Chromium/Android).
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "syncpulse-check") {
    event.waitUntil(checkProjects());
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
