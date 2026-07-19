import { getRedis, SUBS_KEY } from "./_redis.js";

// Stores (POST) or removes (DELETE) a browser's Web Push subscription.
// Subscriptions are opaque push-service tokens — they carry no project data.
export default async function handler(req, res) {
  let redis;
  try {
    redis = getRedis();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const body =
    typeof req.body === "string" ? safeParse(req.body) : req.body || {};

  if (req.method === "POST") {
    // New shape: { subscription, interval, enabled }. Older clients posted the
    // raw subscription — accept both.
    const sub = body && body.subscription ? body.subscription : body;
    if (!sub || !sub.endpoint) {
      return res.status(400).json({ error: "invalid subscription" });
    }
    const interval = Number(body.interval) > 0 ? Number(body.interval) : 30;
    const enabled = body.enabled !== false;
    // lastPushedAt resets to 0 so a newly changed interval takes effect on the
    // very next cron beat instead of waiting out the old schedule.
    const record = { subscription: sub, interval, enabled, lastPushedAt: 0 };
    await redis.hset(SUBS_KEY, { [sub.endpoint]: JSON.stringify(record) });
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    const endpoint =
      (body && body.endpoint) || (body && body.subscription && body.subscription.endpoint);
    if (endpoint) {
      await redis.hdel(SUBS_KEY, endpoint);
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "POST, DELETE");
  return res.status(405).json({ error: "method not allowed" });
}

function safeParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
