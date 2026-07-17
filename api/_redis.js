import { Redis } from "@upstash/redis";

// Shared store for push subscriptions. Works with either a Vercel KV
// integration (KV_REST_API_*) or a direct Upstash Redis (UPSTASH_REDIS_REST_*).
// Files prefixed with "_" are not treated as routes by Vercel.
export const SUBS_KEY = "syncpulse:subs";

// Vercel's storage integration lets you pick a custom env-var prefix, so the
// credentials can arrive as KV_*, UPSTASH_REDIS_*, STORAGE_*, etc. Fall back to
// matching on the suffix so any prefix works. ("_REST_API_TOKEN" deliberately
// won't match a "..._REST_API_READ_ONLY_TOKEN" — we need write access.)
function findBySuffix(suffix) {
  const key = Object.keys(process.env).find((k) => k.endsWith(suffix) && process.env[k]);
  return key ? process.env[key] : undefined;
}

export function getRedis() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    findBySuffix("_REST_API_URL");
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    findBySuffix("_REST_API_TOKEN");
  if (!url || !token) {
    throw new Error(
      "Redis is not configured. Connect a Vercel KV/Upstash database to this " +
        "project, or set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN."
    );
  }
  return new Redis({ url, token });
}
