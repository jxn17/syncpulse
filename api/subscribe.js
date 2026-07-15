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
    if (!body || !body.endpoint) {
      return res.status(400).json({ error: "invalid subscription" });
    }
    await redis.hset(SUBS_KEY, { [body.endpoint]: JSON.stringify(body) });
    return res.status(201).json({ ok: true });
  }

  if (req.method === "DELETE") {
    if (body && body.endpoint) {
      await redis.hdel(SUBS_KEY, body.endpoint);
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
