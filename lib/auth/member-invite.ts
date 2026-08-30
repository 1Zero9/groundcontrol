import { createSignedToken, verifySignedToken } from "./token";

/**
 * Stateless "connect to the family" invite link for an individual family
 * member (e.g. a teen who wants their own login on their own phone),
 * separate from the single household login created at signup. No DB table —
 * the token itself carries which family/member it's for, HMAC-signed with
 * SESSION_SECRET, same hand-rolled approach as session.ts/admin-session.ts.
 * Deliberately short-lived since it grants the ability to create a login.
 *
 * The token also embeds `v`, a snapshot of the member's
 * `invite_token_version` at issue time. Since generating a new link bumps
 * that version (db/auth-queries.ts's `bumpMemberInviteVersion`), callers can
 * compare `v` against the member's current version to reject an older,
 * superseded link even though it's still within its signature/expiry
 * window — this is what gives "generate a new link" revocation semantics.
 */

const MAX_AGE_SECONDS = 60 * 60 * 24 * 3; // 3 days

export type MemberInvitePayload = {
  familyId: string;
  memberId: string;
  v: number;
  exp: number;
};

export function createMemberInviteToken(payload: {
  familyId: string;
  memberId: string;
  v: number;
}): string {
  return createSignedToken<MemberInvitePayload>(payload, MAX_AGE_SECONDS);
}

export function verifyMemberInviteToken(
  token: string | undefined
): { familyId: string; memberId: string; v: number } | null {
  const payload = verifySignedToken<MemberInvitePayload>(token);
  if (!payload) return null;
  return { familyId: payload.familyId, memberId: payload.memberId, v: payload.v };
}
