import { cookies } from "next/headers";
import { createSignedToken, verifySignedToken } from "./token";

/**
 * Completely separate session from the family `gc_session` cookie
 * (`session.ts`). Admin identity lives in its own `admins` table (see
 * `db/schema.ts` / `db/admin-auth-queries.ts`) — there is no such thing as
 * "a family user who is also an admin." A family login can never carry
 * admin rights, by construction: this cookie/payload/table never
 * references `familyId` or `users` at all.
 */

const COOKIE_NAME = "gc_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours — shorter-lived than family sessions on purpose

export type AdminSessionPayload = {
  adminId: string;
  exp: number;
};

export function createAdminSessionToken(payload: Omit<AdminSessionPayload, "exp">): string {
  return createSignedToken<AdminSessionPayload>(payload, MAX_AGE_SECONDS);
}

export function verifyAdminSessionToken(token: string | undefined): AdminSessionPayload | null {
  return verifySignedToken<AdminSessionPayload>(token);
}

export async function setAdminSessionCookie(payload: Omit<AdminSessionPayload, "exp">) {
  const token = createAdminSessionToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}
