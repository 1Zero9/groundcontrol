import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { getDb } from "../db/index";

export type RateLimitResult = {
  allowed: boolean;
  /** Only set when `allowed` is false. */
  retryAfterSeconds?: number;
};

/**
 * Fixed-window, DB-backed rate limiter for auth endpoints (login, signup,
 * invite-claim). DB-backed rather than an in-memory Map because Vercel's
 * serverless functions are stateless and can run as many concurrent
 * instances — an in-process counter would reset on every cold start and
 * wouldn't slow down a real attacker at all.
 *
 * Uses a single atomic `INSERT ... ON CONFLICT DO UPDATE` so concurrent
 * requests for the same key can't race past the limit, and rolls the
 * window forward (resetting the count to 1) once `windowSeconds` has
 * elapsed since it started. Not a hard security boundary by itself — just a
 * speed bump on top of hashed passwords + short-lived signed tokens.
 */
export async function checkRateLimit(
  key: string,
  options: { max: number; windowSeconds: number }
): Promise<RateLimitResult> {
  const db = getDb();
  const { max, windowSeconds } = options;

  const result = await db.execute(sql`
    INSERT INTO rate_limits (key, attempts, window_start, updated_at)
    VALUES (${key}, 1, now(), now())
    ON CONFLICT (key) DO UPDATE SET
      attempts = CASE
        WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second')
          THEN 1
        ELSE rate_limits.attempts + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - (${windowSeconds} * interval '1 second')
          THEN now()
        ELSE rate_limits.window_start
      END,
      updated_at = now()
    RETURNING attempts, window_start
  `);

  const row = (result as unknown as { rows: { attempts: number; window_start: string }[] })
    .rows[0];
  if (!row) {
    return { allowed: true };
  }

  if (row.attempts > max) {
    const windowStartMs = new Date(row.window_start).getTime();
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((windowStartMs + windowSeconds * 1000 - Date.now()) / 1000)
    );
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true };
}

/**
 * Clears a key's attempt counter — call on successful auth so a legitimate
 * user who mistyped their password a few times isn't left with a partially
 * "used up" window right after they get in.
 */
export async function resetRateLimit(key: string): Promise<void> {
  const db = getDb();
  await db.execute(sql`DELETE FROM rate_limits WHERE key = ${key}`);
}

/**
 * Best-effort client IP for rate-limit keys. Trusts `x-forwarded-for` (set
 * by Vercel's edge network); falls back to a constant so local dev / a
 * missing header still shares one bucket rather than throwing.
 */
export async function getClientIp(): Promise<string> {
  const store = await headers();
  const forwardedFor = store.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return store.get("x-real-ip") ?? "unknown";
}

function formatRetryAfter(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds === 1 ? "" : "s"}`;
  }
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

export function rateLimitMessage(result: RateLimitResult): string {
  const wait = result.retryAfterSeconds ? formatRetryAfter(result.retryAfterSeconds) : "a bit";
  return `Too many attempts. Please wait ${wait} and try again.`;
}
