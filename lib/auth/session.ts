import { cookies } from "next/headers";
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
