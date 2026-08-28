import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { admins } from "./schema";

/**
 * Auth queries for the standalone `admins` table. Deliberately separate from
 * `db/auth-queries.ts` (family logins) — an admin login has no `familyId`
 * and is never joined against `users`/`families`.
 */

export async function getAdminByEmail(email: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email.toLowerCase().trim()))
    .limit(1);
  return row ?? null;
}

export async function getAdminById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(admins).where(eq(admins.id, id)).limit(1);
  return row ?? null;
}

export async function createAdmin(email: string, passwordHash: string) {
  const db = getDb();
  const [row] = await db
    .insert(admins)
    .values({ email: email.toLowerCase().trim(), passwordHash })
    .returning();
  return row;
}
