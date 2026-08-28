import { asc } from "drizzle-orm";
import { getDb } from "./index";
import { familyMembers, familyModules, families, modules, users } from "./schema";
import { moduleRegistry } from "../src/core/module-registry";
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
        feedUrl: typeof config.feedUrl === "string" ? config.feedUrl : undefined,
        lastSyncedAt: typeof config.lastSyncedAt === "string" ? config.lastSyncedAt : undefined,
      };
    });

    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt.toISOString(),
      ownerEmail: ownerEmailByFamily.get(family.id) ?? null,
      memberNames: membersByFamily.get(family.id) ?? [],
      modules: familyModulesList,
    };
  });
}
