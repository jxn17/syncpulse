import webpush from "web-push";
import { getRedis, SUBS_KEY } from "./_redis.js";

// Public VAPID key (safe to ship — it's public by design). Overridable via env
// if you regenerate the keypair. The matching PRIVATE key is a server secret.
const DEFAULT_VAPID_PUBLIC =
  "BNzo4zs27mG_pF8c5VVoFU5z1Nszhz-JIbAeMl3M81lGSAjyainsXm9iqLYob3LJon0z3f6x6GYYiIyGcMtuSsk";

// Cron target: fans out a content-less "check now" push to every stored
// subscription. Each device's service worker then reads its own local snapshot
// and decides whether to show a reminder — no project data ever reaches here.
export default async function handler(req, res) {
  // Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  // An external cron can instead pass `?key=<CRON_SECRET>`.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    const key = req.query && req.query.key;
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return res.status(401).json({ error: "unauthorized" });
    }
  }

  const publicKey =
    process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    return res.status(500).json({ error: "VAPID_PRIVATE_KEY not configured" });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:notifications@syncpulse.app",
    publicKey,
    privateKey
  );

  let redis;
  try {
    redis = getRedis();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const subsMap = (await redis.hgetall(SUBS_KEY)) || {};
  const entries = Object.entries(subsMap);
  // ?test=1 forces every device to push right now, bypassing the interval
  // gate — used to verify delivery on demand.
  const isTest = req.query && (req.query.test === "1" || req.query.test === "true");
  const payload = JSON.stringify({ type: isTest ? "test" : "check", test: !!isTest, at: Date.now() });
  const now = Date.now();

  let sent = 0;
  let removed = 0;
  let skipped = 0;
  await Promise.all(
    entries.map(async ([endpoint, raw]) => {
      const rec = typeof raw === "string" ? safeParse(raw) : raw;
      if (!rec) return;
      // Accept both the record shape and the legacy raw-subscription shape.
      const sub = rec.subscription || rec;
      if (!sub || !sub.endpoint) return;

      // Per-device interval gate: only push once the user's chosen interval has
      // elapsed since the last push to this device. This lets a fixed-cadence
      // cron drive any interval, and means (almost) every push shows a
      // notification — so the browser's silent-push budget isn't burned.
      if (!isTest) {
        if (rec.enabled === false) { skipped++; return; }
        const intervalMs = (Number(rec.interval) > 0 ? Number(rec.interval) : 30) * 60000;
        const last = Number(rec.lastPushedAt) || 0;
        if (now - last < intervalMs * 0.9) { skipped++; return; }
      }

      try {
        await webpush.sendNotification(sub, payload, { TTL: 900 });
        sent++;
        if (!isTest) {
          const updated = { ...rec, subscription: sub, lastPushedAt: now };
          await redis.hset(SUBS_KEY, { [endpoint]: JSON.stringify(updated) });
        }
      } catch (err) {
        // 404/410 mean the subscription is dead — prune it.
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          await redis.hdel(SUBS_KEY, endpoint);
          removed++;
        }
      }
    })
  );

  return res.status(200).json({ ok: true, total: entries.length, sent, skipped, removed });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
