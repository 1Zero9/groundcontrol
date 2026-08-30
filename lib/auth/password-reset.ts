import { createSignedToken, verifySignedToken } from "./token";

/**
 * Stateless "reset your password" link. Same hand-rolled, HMAC-signed
 * approach as member-invite.ts/session.ts — no DB table, short-lived since
 * it grants the ability to set a new password for the account.
 */

const MAX_AGE_SECONDS = 60 * 60; // 1 hour

export type PasswordResetPayload = {
  userId: string;
  exp: number;
};

export function createPasswordResetToken(userId: string): string {
  return createSignedToken<PasswordResetPayload>({ userId }, MAX_AGE_SECONDS);
}

export function verifyPasswordResetToken(token: string | undefined): { userId: string } | null {
  const payload = verifySignedToken<PasswordResetPayload>(token);
  if (!payload) return null;
  return { userId: payload.userId };
}
