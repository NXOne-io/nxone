/** Small helpers so every route answers the same way. */

export const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: { "Content-Type": "application/json; charset=utf-8", ...(init.headers ?? {}) }
  });

export const problem = (status: number, message: string, extra: Record<string, unknown> = {}) =>
  json({ error: message, ...extra }, { status });

/** The app and the API are on different hosts, so the browser needs to be told this is allowed. */
export function corsHeaders(origin: string | null, allowed: string[]): HeadersInit {
  const ok = origin && allowed.includes(origin) ? origin : allowed[0];
  return {
    "Access-Control-Allow-Origin": ok,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

/**
 * A plain limiter: so many attempts per key per window, held in KV. It is there to make guessing
 * and mail-bombing slow, not to be a traffic system.
 */
export async function rateLimit(kv: KVNamespace, key: string, limit: number, windowMs: number): Promise<boolean> {
  const bucket = `rl:${key}:${Math.floor(Date.now() / windowMs)}`;
  const current = Number((await kv.get(bucket)) ?? 0);
  if (current >= limit) return false;
  await kv.put(bucket, String(current + 1), { expirationTtl: Math.max(60, Math.ceil(windowMs / 1000)) });
  return true;
}
