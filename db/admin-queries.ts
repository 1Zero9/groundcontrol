import { asc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { familyMembers, familyModules, families, modules, users } from "./schema";
import { moduleRegistry } from "../src/core/module-registry";
import { listCustomServices, type CustomService } from "./custom-services-queries";
import { readModuleFeeds } from "./queries";
import type { GroundControlModule } from "../src/core/models";

/**
 * ADMIN QUERIES
 * -------------
 * Everything here is for the operator-only /admin console. These
 * deliberately only ever touch `families` / `family_members` (names, for
 * identification) / `modules` / `family_modules` (enable state + connector
 * config) — they never select from `events` or `board_items`, so a household's
 * calendar, notes, tasks, etc. are structurally impossible to read through
 * this file. See docs/TECHNICAL.md §9.
 */

export type AdminFamilySummary = {
  id: string;
  name: string;
  createdAt: string;
  ownerEmail: string | null;
  memberNames: string[];
  modules: GroundControlModule[];
  customServices: CustomService[];
};

export async function listFamiliesForAdmin(): Promise<AdminFamilySummary[]> {
  const db = getDb();

  const [familyRows, memberRows, userRows, moduleRows, familyModuleRows] = await Promise.all([
    db.select().from(families).orderBy(asc(families.createdAt)),
    db.select({ familyId: familyMembers.familyId, name: familyMembers.name }).from(familyMembers),
    db.select({ familyId: users.familyId, email: users.email }).from(users),
    db.select().from(modules),
    db.select().from(familyModules),
  ]);

  const customServicesByFamily = new Map(
    await Promise.all(
      familyRows.map(async (family) => [family.id, await listCustomServices(family.id)] as const)
    )
  );

  const membersByFamily = new Map<string, string[]>();
  for (const m of memberRows) {
    const list = membersByFamily.get(m.familyId) ?? [];
    list.push(m.name);
    membersByFamily.set(m.familyId, list);
  }

  const ownerEmailByFamily = new Map(userRows.map((u) => [u.familyId, u.email]));
  const dbModuleByKey = new Map(moduleRows.map((m) => [m.key, m]));
  const familyModuleByKey = new Map(
    familyModuleRows.map((fm) => [`${fm.familyId}:${fm.moduleId}`, fm])
  );

  return familyRows.map((family) => {
    const familyModulesList: GroundControlModule[] = moduleRegistry.map((def) => {
      const dbModule = dbModuleByKey.get(def.key);
      const familyModule = dbModule
        ? familyModuleByKey.get(`${family.id}:${dbModule.id}`)
        : undefined;
      const enabled = familyModule ? familyModule.enabled : def.isCore;
      const config = (familyModule?.config as Record<string, unknown>) ?? {};

      return {
        id: dbModule?.id ?? def.key,
        key: def.key,
        name: def.name,
        description: def.description,
        enabled,
        isCore: def.isCore,
        icon: def.icon,
        feeds: readModuleFeeds(config),
      };
    });

    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt.toISOString(),
      ownerEmail: ownerEmailByFamily.get(family.id) ?? null,
      memberNames: membersByFamily.get(family.id) ?? [],
      modules: familyModulesList,
      customServices: customServicesByFamily.get(family.id) ?? [],
    };
  });
}

/**
 * Renames a household. This is the only way to turn the seeded demo
 * "Cranfield Family" into a real household's own name — deliberately
 * separate from the family's own Modules screen since a family can't
 * rename itself today.
 */
export async function renameFamily(familyId: string, name: string): Promise<void> {
  const db = getDb();
  await db.update(families).set({ name: name.trim() }).where(eq(families.id, familyId));
}

/**
 * Resets (or creates, if somehow missing) the single login account for a
 * household — email + password hash. Takes an already-hashed password
 * (see lib/auth/password.ts's `hashPassword`) so this file never handles
 * plaintext. Scoped by `familyId`, not `users.id`, since the app only ever
 * has one login per family (see `createFamilyWithOwner`).
 */
export async function resetFamilyLogin(
  familyId: string,
  email: string,
  passwordHash: string
): Promise<void> {
  const db = getDb();
  const normalizedEmail = email.toLowerCase().trim();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.familyId, familyId))
    .limit(1);

  if (existing) {
    await db
      .update(users)
      .set({ email: normalizedEmail, passwordHash })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({ familyId, email: normalizedEmail, passwordHash });
  }
}
