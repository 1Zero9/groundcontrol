import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSignedToken, verifySignedToken } from "./token";

const COOKIE_NAME = "gc_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string;
  familyId: string;
  exp: number;
};

export function createSessionToken(payload: Omit<SessionPayload, "exp">): string {
  return createSignedToken<SessionPayload>(payload, MAX_AGE_SECONDS);
}

export function verifySessionToken(token: string | undefined): SessionPayload | null {
  return verifySignedToken<SessionPayload>(token);
}

export async function setSessionCookie(payload: Omit<SessionPayload, "exp">) {
  const token = createSessionToken(payload);
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

/**
 * Gate for server actions that mutate/read family-scoped data. Always
 * derive `familyId` (and any ownership checks) from this session server-side
 * — never trust a `familyId` sent from the client — so one signed-in family
 * can never read or write another family's data by tampering with a
 * server-action argument. Mirrors `requireAdmin()` in `lib/auth/admin.ts`.
 */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
