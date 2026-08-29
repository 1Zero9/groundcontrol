import { randomUUID } from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { familyMembers, familyModules, families, moduleRequests, modules, users } from "./schema";
import { moduleRegistry } from "../src/core/module-registry";
import { listCustomServices, type CustomService } from "./custom-services-queries";
import { readModuleFeeds } from "./queries";
import type { ModuleRequest } from "./module-requests-queries";
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

  const customModuleRows = moduleRows.filter((m) => m.isCustom);

  return familyRows.map((family) => {
    const registryModulesList: GroundControlModule[] = moduleRegistry.map((def) => {
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

    // Only include custom modules actually assigned to this family (a
    // family_modules row exists) — matches getFamilyModules() on the family
    // side, so admin sees exactly what the household sees.
    const assignedCustomModules: GroundControlModule[] = customModuleRows
      .map((dbModule) => {
        const familyModule = familyModuleByKey.get(`${family.id}:${dbModule.id}`);
        if (!familyModule) return undefined;
        const config = (familyModule.config as Record<string, unknown>) ?? {};
        const custom: GroundControlModule = {
          id: dbModule.id,
          key: dbModule.key,
          name: dbModule.name,
          description: dbModule.description ?? "",
          enabled: familyModule.enabled,
          isCore: false,
          isCustom: true,
          icon: dbModule.icon ?? undefined,
          colour: dbModule.colour ?? undefined,
          feeds: readModuleFeeds(config),
        };
        return custom;
      })
      .filter((m): m is GroundControlModule => m !== undefined);

    return {
      id: family.id,
      name: family.name,
      createdAt: family.createdAt.toISOString(),
      ownerEmail: ownerEmailByFamily.get(family.id) ?? null,
      memberNames: membersByFamily.get(family.id) ?? [],
      modules: [...registryModulesList, ...assignedCustomModules],
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

// ---------------------------------------------------------------------------
// Module catalog — admin-created custom modules, and which families they've
// been assigned to. Registry modules (src/core/module-registry.ts) aren't
// managed here; they're already available to every family by default.
// ---------------------------------------------------------------------------

export type AdminModuleCatalogItem = {
  id: string;
  key: string;
  name: string;
  description?: string;
  icon?: string;
  colour?: string;
  createdAt: string;
  /** Families this module has been explicitly assigned to. */
  assignedFamilies: { familyId: string; familyName: string }[];
};

export async function listModuleCatalogForAdmin(): Promise<AdminModuleCatalogItem[]> {
  const db = getDb();
  const [customModuleRows, familyModuleRows, familyRows] = await Promise.all([
    db.select().from(modules).where(eq(modules.isCustom, true)),
    db.select().from(familyModules),
    db.select({ id: families.id, name: families.name }).from(families),
  ]);

  const familyNameById = new Map(familyRows.map((f) => [f.id, f.name]));
  const assignedFamiliesByModuleId = new Map<string, { familyId: string; familyName: string }[]>();
  for (const fm of familyModuleRows) {
    const familyName = familyNameById.get(fm.familyId);
    if (!familyName) continue;
    const list = assignedFamiliesByModuleId.get(fm.moduleId) ?? [];
    list.push({ familyId: fm.familyId, familyName });
    assignedFamiliesByModuleId.set(fm.moduleId, list);
  }

  return customModuleRows
    .map((m) => ({
      id: m.id,
      key: m.key,
      name: m.name,
      description: m.description ?? undefined,
      icon: m.icon ?? undefined,
      colour: m.colour ?? undefined,
      createdAt: m.createdAt.toISOString(),
      assignedFamilies: (assignedFamiliesByModuleId.get(m.id) ?? []).sort((a, b) =>
        a.familyName.localeCompare(b.familyName)
      ),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export type NewCustomModuleInput = {
  name: string;
  description?: string;
  icon?: string;
  colour?: string;
};

/**
 * Creates a brand-new module type at runtime (no code change / deploy
 * needed). Generates its own unique `key` slug since custom modules don't
 * correspond to anything in src/core/module-registry.ts. Not assigned to
 * any family yet — that's a separate step (see setCustomModuleAssignment).
 */
export async function createCustomModule(
  input: NewCustomModuleInput
): Promise<AdminModuleCatalogItem> {
  const db = getDb();
  const key = `custom-${randomUUID().slice(0, 8)}`;
  const [row] = await db
    .insert(modules)
    .values({
      key,
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      icon: input.icon,
      colour: input.colour,
      isCustom: true,
    })
    .returning();

  return {
    id: row.id,
    key: row.key,
    name: row.name,
    description: row.description ?? undefined,
    icon: row.icon ?? undefined,
    colour: row.colour ?? undefined,
    createdAt: row.createdAt.toISOString(),
    assignedFamilies: [],
  };
}

/** Deleting a custom module cascades to remove any family_modules assignment rows. */
export async function deleteCustomModule(moduleId: string): Promise<void> {
  const db = getDb();
  await db.delete(modules).where(and(eq(modules.id, moduleId), eq(modules.isCustom, true)));
}

/**
 * Assigns or unassigns a custom module to a family — presence of a
 * `family_modules` row is what makes it appear at all for that family (see
 * getFamilyModules() in db/queries.ts). Unassigning deletes the row rather
 * than just disabling it, since "not assigned" and "assigned but off" are
 * different things for custom modules.
 */
export async function setCustomModuleAssignment(
  moduleId: string,
  familyId: string,
  assigned: boolean
): Promise<void> {
  const db = getDb();
  if (assigned) {
    await db
      .insert(familyModules)
      .values({ familyId, moduleId, enabled: true })
      .onConflictDoNothing({ target: [familyModules.familyId, familyModules.moduleId] });
  } else {
    await db
      .delete(familyModules)
      .where(and(eq(familyModules.familyId, familyId), eq(familyModules.moduleId, moduleId)));
  }
}

// ---------------------------------------------------------------------------
// Module requests — admin side (review queue). See db/module-requests-queries.ts
// for the family-facing half (submitting a request, viewing your own).
// ---------------------------------------------------------------------------

export type AdminModuleRequest = ModuleRequest & { familyName: string };

function mapModuleRequestRow(
  row: typeof moduleRequests.$inferSelect,
  familyName: string
): AdminModuleRequest {
  return {
    id: row.id,
    familyId: row.familyId,
    familyName,
    requestedByName: row.requestedByName ?? undefined,
    title: row.title,
    reason: row.reason ?? undefined,
    status: row.status,
    adminNote: row.adminNote ?? undefined,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : undefined,
  };
}

export async function listModuleRequestsForAdmin(): Promise<AdminModuleRequest[]> {
  const db = getDb();
  const [requestRows, familyRows] = await Promise.all([
    db.select().from(moduleRequests).orderBy(desc(moduleRequests.createdAt)),
    db.select({ id: families.id, name: families.name }).from(families),
  ]);
  const familyNameById = new Map(familyRows.map((f) => [f.id, f.name]));
  return requestRows.map((row) =>
    mapModuleRequestRow(row, familyNameById.get(row.familyId) ?? "Unknown household")
  );
}

export async function resolveModuleRequest(
  requestId: string,
  status: "approved" | "declined",
  adminNote?: string
): Promise<void> {
  const db = getDb();
  await db
    .update(moduleRequests)
    .set({ status, adminNote: adminNote?.trim() || undefined, resolvedAt: new Date() })
    .where(eq(moduleRequests.id, requestId));
}
