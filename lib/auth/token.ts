import { createHmac, timingSafeEqual } from "crypto";

/**
 * Generic signed-token helper shared by both the family session
 * (`session.ts`) and the completely separate admin session
 * (`admin-session.ts`). Deliberately hand-rolled (no JWT library) — same
 * approach as the rest of `lib/auth/`.
 */

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Add it in Vercel → Project → Settings → Environment Variables, " +
        "or to .env.local for local development."
    );
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSignedToken<T extends { exp: number }>(
  payload: Omit<T, "exp">,
  maxAgeSeconds: number
): string {
  const full = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 } as T;
  const body = Buffer.from(JSON.stringify(full)).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifySignedToken<T extends { exp: number }>(
  token: string | undefined
): T | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as T;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
