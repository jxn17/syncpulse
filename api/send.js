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
  const payload = JSON.stringify({ type: "check", at: Date.now() });

  let sent = 0;
  let removed = 0;
  await Promise.all(
    entries.map(async ([endpoint, raw]) => {
      const sub = typeof raw === "string" ? safeParse(raw) : raw;
      if (!sub || !sub.endpoint) return;
      try {
        await webpush.sendNotification(sub, payload, { TTL: 900 });
        sent++;
      } catch (err) {
        // 404/410 mean the subscription is dead — prune it.
        if (err && (err.statusCode === 404 || err.statusCode === 410)) {
          await redis.hdel(SUBS_KEY, endpoint);
          removed++;
        }
      }
    })
  );

  return res.status(200).json({ ok: true, total: entries.length, sent, removed });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
