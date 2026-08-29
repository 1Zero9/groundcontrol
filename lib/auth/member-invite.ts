import { createSignedToken, verifySignedToken } from "./token";

/**
 * Stateless "connect to the family" invite link for an individual family
 * member (e.g. a teen who wants their own login on their own phone),
 * separate from the single household login created at signup. No DB table —
 * the token itself carries which family/member it's for, HMAC-signed with
 * SESSION_SECRET, same hand-rolled approach as session.ts/admin-session.ts.
 * Deliberately short-lived since it grants the ability to create a login.
 */

const MAX_AGE_SECONDS = 60 * 60 * 24 * 3; // 3 days

export type MemberInvitePayload = {
  familyId: string;
  memberId: string;
  exp: number;
};

export function createMemberInviteToken(payload: {
  familyId: string;
  memberId: string;
}): string {
  return createSignedToken<MemberInvitePayload>(payload, MAX_AGE_SECONDS);
}

export function verifyMemberInviteToken(
  token: string | undefined
): { familyId: string; memberId: string } | null {
  const payload = verifySignedToken<MemberInvitePayload>(token);
  if (!payload) return null;
  return { familyId: payload.familyId, memberId: payload.memberId };
}
