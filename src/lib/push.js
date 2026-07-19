// Web Push client helpers. The public VAPID key is safe to ship; it can be
// overridden with VITE_VAPID_PUBLIC_KEY at build time if you regenerate keys.
const VAPID_PUBLIC_KEY =
  /** @type {any} */ (import.meta).env?.VITE_VAPID_PUBLIC_KEY ||
  "BNzo4zs27mG_pF8c5VVoFU5z1Nszhz-JIbAeMl3M81lGSAjyainsXm9iqLYob3LJon0z3f6x6GYYiIyGcMtuSsk";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

// Subscribes this browser to Web Push and registers the subscription with the
// server, along with the user's chosen reminder interval and on/off state — the
// server uses these to decide how often to actually push, so a fixed-cadence
// cron can drive any interval you pick in-app. Safe to call repeatedly (reuses
// an existing subscription); call it again whenever the interval changes.
// Returns null when push isn't available (dev with no SW, unsupported browser).
export async function subscribeToPush(config = {}) {
  if (!pushSupported() || !VAPID_PUBLIC_KEY) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) return null; // no SW (dev build) — nothing to subscribe to
    const reg = await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub,
        interval: config.interval,
        enabled: config.enabled,
      }),
    });
    return sub;
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush() {
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg && (await reg.pushManager.getSubscription());
    if (!sub) return;
    await fetch("/api/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  } catch {
    // best-effort
  }
}
