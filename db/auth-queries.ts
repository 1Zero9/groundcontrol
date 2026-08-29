import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { families, familyMembers, familyModules, modules, users } from "./schema";
import { seedDemoDataForFamily } from "./queries";

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

  await seedDemoDataForFamily(family.id, member.id);

  return { family, user, member };
}

/**
 * Checks a family member is eligible for a "connect to the app" invite link:
 * must belong to the given family and not already have their own login.
 * Throws rather than returning a boolean so callers get a clear error
 * message for the (rare, user-triggered) failure cases.
 */
export async function assertMemberInviteEligible(
  familyId: string,
  memberId: string
): Promise<void> {
  const db = getDb();
  const [row] = await db
    .select({ familyId: familyMembers.familyId, userId: familyMembers.userId })
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1);

  if (!row || row.familyId !== familyId) {
    throw new Error("Family member not found.");
  }
  if (row.userId) {
    throw new Error("This family member is already connected.");
  }
}

export type ClaimFamilyMemberInviteInput = {
  familyId: string;
  memberId: string;
  email: string;
  passwordHash: string;
};

/**
 * Completes a "connect to the app" invite: creates a new login (`users` row)
 * scoped to the same family and links it to the invited family member's
 * existing profile via `family_members.user_id`. Re-validates eligibility so
 * a link can't be claimed twice (e.g. two tabs racing) or against the wrong
 * family.
 */
export async function claimFamilyMemberInvite(input: ClaimFamilyMemberInviteInput) {
  await assertMemberInviteEligible(input.familyId, input.memberId);

  const db = getDb();

  const [user] = await db
    .insert(users)
    .values({
      familyId: input.familyId,
      email: input.email.toLowerCase().trim(),
      passwordHash: input.passwordHash,
    })
    .returning();

  const [member] = await db
    .update(familyMembers)
    .set({ userId: user.id })
    .where(eq(familyMembers.id, input.memberId))
    .returning();

  return { user, member };
}
