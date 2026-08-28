import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { families, familyMembers, familyModules, modules, users } from "./schema";

const MEMBER_COLOURS = ["#6C4DFF", "#FF5CA8", "#22C1A2", "#4D96FF", "#FFB347"];

export async function getUserByEmail(email: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return row ?? null;
}

export async function getUserById(id: string) {
  const db = getDb();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export type CreateFamilyWithOwnerInput = {
  familyName: string;
  ownerName: string;
  email: string;
  passwordHash: string;
};

/**
 * Signup: creates a brand new family, an adult profile for the person
 * signing up, and the login account linking the two. Also enables the
 * core modules (planner/board) for the new family so it behaves the same
 * as the seeded demo family.
 */
export async function createFamilyWithOwner(input: CreateFamilyWithOwnerInput) {
  const db = getDb();

  const [family] = await db
    .insert(families)
    .values({ name: input.familyName })
    .returning();

  const [user] = await db
    .insert(users)
    .values({
      familyId: family.id,
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
    })
    .returning();

  const [member] = await db
    .insert(familyMembers)
    .values({
      familyId: family.id,
      userId: user.id,
      name: input.ownerName,
      shortName: input.ownerName.charAt(0).toUpperCase(),
      colour: MEMBER_COLOURS[0],
      role: "adult",
      title: "Parent & Commander",
    })
    .returning();

  const coreModules = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.isCore, true));

  if (coreModules.length > 0) {
    await Promise.all(
      coreModules.map((m) =>
        db.insert(familyModules).values({
          familyId: family.id,
          moduleId: m.id,
          enabled: true,
        })
      )
    );
  }

  return { family, user, member };
}
