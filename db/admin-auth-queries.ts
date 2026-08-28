import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { admins } from "./schema";

/**
 * Auth queries for the standalone `admins` table. Deliberately separate from
 * `db/auth-queries.ts` (family logins) — an admin login has no `familyId`
 * and is never joined against `users`/`families`. No password hash here:
 * identity comes entirely from a verified Google account (see
 * `lib/auth/google-oauth.ts`), gated by `lib/auth/admin-allowlist.ts`.
 */

export async function getAdminById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return row ?? null;
}

export async function getAdminByEmail(email: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email.toLowerCase().trim()))
    .limit(1);
  return row ?? null;
}

/**
 * Finds the admin row for a Google account, creating it on first successful
 * sign-in. Callers MUST have already checked `isAllowedAdminEmail(email)`
 * before calling this — this function does not itself enforce the
 * allowlist, it just persists identity for an already-authorized sign-in.
 */
export async function upsertAdminFromGoogleProfile(profile: {
  email: string;
  googleId: string;
}) {
  const db = getDb();
  const email = profile.email.toLowerCase().trim();

  const existing = await getAdminByEmail(email);
  if (existing) {
    if (existing.googleId !== profile.googleId) {
      const [updated] = await db
        .update(admins)
        .set({ googleId: profile.googleId })
        .where(eq(admins.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  const [created] = await db
    .insert(admins)
    .values({ email, googleId: profile.googleId })
    .returning();
  return created;
}
