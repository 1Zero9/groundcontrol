import { randomUUID } from "crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { boardItems, events, familyMembers, familyModules, families, modules } from "./schema";
import { getModuleByCategory, moduleRegistry } from "../src/core/module-registry";
import { parseIcalFeed } from "../src/core/connectors";
import { listCustomServices } from "./custom-services-queries";
import type { BoardItem, Event, FamilyMember, GroundControlModule, ModuleFeed } from "../src/core/models";

type MemberRow = typeof familyMembers.$inferSelect;
type EventRow = typeof events.$inferSelect;
type BoardItemRow = typeof boardItems.$inferSelect;

function mapMember(row: MemberRow): FamilyMember {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    shortName: row.shortName ?? undefined,
    nickname: row.nickname ?? undefined,
    colour: row.colour,
    avatarEmoji: row.avatarEmoji ?? undefined,
    role: row.role,
    title: row.title ?? undefined,
    hasAccount: row.userId != null,
    lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : undefined,
  };
}

function mapEvent(row: EventRow, moduleKey?: string | null): Event {
  return {
    id: row.id,
    familyId: row.familyId,
    moduleKey: moduleKey ?? undefined,
    customServiceId: row.customServiceId ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    start: row.start.toISOString(),
    end: row.end ? row.end.toISOString() : undefined,
    allDay: row.allDay,
    personIds: row.personIds,
    category: row.category,
    location: row.location ?? undefined,
    icon: row.icon ?? undefined,
    accentColor: row.accentColor ?? undefined,
    source: row.source ?? undefined,
    sourceId: row.sourceId ?? undefined,
    status: row.status,
    hiddenAt: row.hiddenAt ? row.hiddenAt.toISOString() : undefined,
    snoozedUntil: row.snoozedUntil ? row.snoozedUntil.toISOString() : undefined,
    details: (row.details as Record<string, unknown>) ?? undefined,
    isDemo: row.isDemo,
  };
}

function mapBoardItem(row: BoardItemRow, moduleKey?: string | null): BoardItem {
  return {
    id: row.id,
    familyId: row.familyId,
    moduleKey: moduleKey ?? undefined,
    customServiceId: row.customServiceId ?? undefined,
    text: row.text,
    subtitle: row.subtitle ?? undefined,
    type: row.type,
    personIds: row.personIds,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : undefined,
    countdownDate: row.countdownDate ? row.countdownDate.toISOString() : undefined,
    progressCurrent: row.progressCurrent ?? undefined,
    progressTotal: row.progressTotal ?? undefined,
    pinned: row.pinned,
    completed: row.completed,
    badge: row.badge ?? undefined,
    color: row.color ?? undefined,
    isDemo: row.isDemo,
  };
}

/**
 * Reads the calendar feeds attached to a module from its `family_modules.config`
 * JSON blob. Modules support multiple feeds (e.g. one per kid/team) stored as
 * `config.feeds: ModuleFeed[]`. Transparently migrates the older single-feed
 * shape (`config.feedUrl` + `config.lastSyncedAt`) into a one-item feeds list
 * so existing households don't lose their configured feed.
 */
export function readModuleFeeds(config: Record<string, unknown>): ModuleFeed[] {
  if (Array.isArray(config.feeds)) {
    return config.feeds as ModuleFeed[];
  }
  if (typeof config.feedUrl === "string" && config.feedUrl) {
    return [
      {
        id: "default",
        label: "Calendar feed",
        url: config.feedUrl,
        lastSyncedAt:
          typeof config.lastSyncedAt === "string" ? config.lastSyncedAt : undefined,
      },
    ];
  }
  return [];
}

/**
 * Looks up a module's DB row id by its registry key, self-healing by
 * auto-inserting a row from the code-level `moduleRegistry` definition the
 * first time a module (e.g. a newly added one like "bills") is used but
 * hasn't been provisioned in the `modules` table yet.
 */
async function getModuleId(key: string): Promise<string | undefined> {
  const db = getDb();
  const [row] = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.key, key))
    .limit(1);
  if (row) return row.id;

  const def = moduleRegistry.find((m) => m.key === key);
  if (!def) return undefined;

  const [inserted] = await db
    .insert(modules)
    .values({
      key: def.key,
      name: def.name,
      description: def.description,
      icon: def.icon,
      isCore: def.isCore,
    })
    .onConflictDoNothing({ target: modules.key })
    .returning({ id: modules.id });

  if (inserted) return inserted.id;

  const [existing] = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.key, key))
    .limit(1);
  return existing?.id;
}

/**
 * Until real auth (Phase 2) lands, the app only shows a single seeded
 * family. This picks the oldest one so local dev / preview always resolve
 * to the same demo family created by `npm run db:seed`.
 */
export async function getDefaultFamilyId(): Promise<string> {
  const db = getDb();
  const [family] = await db
    .select({ id: families.id })
    .from(families)
    .orderBy(asc(families.createdAt))
    .limit(1);

  if (!family) {
    throw new Error("No family found. Run `npm run db:seed` first.");
  }
  return family.id;
}

export async function getFamilyBundle(familyId: string) {
  const db = getDb();

  const [memberRows, eventRows, boardRows, customServices] = await Promise.all([
    db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.familyId, familyId))
      .orderBy(asc(familyMembers.createdAt)),
    db
      .select({ event: events, moduleKey: modules.key })
      .from(events)
      .leftJoin(modules, eq(events.moduleId, modules.id))
      .where(eq(events.familyId, familyId))
      .orderBy(asc(events.start)),
    db
      .select({ item: boardItems, moduleKey: modules.key })
      .from(boardItems)
      .leftJoin(modules, eq(boardItems.moduleId, modules.id))
      .where(eq(boardItems.familyId, familyId))
      .orderBy(desc(boardItems.createdAt)),
    listCustomServices(familyId),
  ]);

  return {
    members: memberRows.map(mapMember),
    events: eventRows.map((r) => mapEvent(r.event, r.moduleKey)),
    boardItems: boardRows.map((r) => mapBoardItem(r.item, r.moduleKey)),
    customServices,
  };
}

export type NewFamilyMemberInput = {
  familyId: string;
  name: string;
  shortName?: string;
  colour: string;
  avatarEmoji?: string;
  role: "adult" | "teen" | "child" | "pet";
  title?: string;
};

export async function createFamilyMember(input: NewFamilyMemberInput): Promise<FamilyMember> {
  const db = getDb();

  const [row] = await db
    .insert(familyMembers)
    .values({
      familyId: input.familyId,
      name: input.name,
      shortName: input.shortName,
      colour: input.colour,
      avatarEmoji: input.avatarEmoji,
      role: input.role,
      title: input.title,
    })
    .returning();

  return mapMember(row);
}

/** Scoped to `familyId` so one household can't edit another's member by guessing an id. */
export async function updateFamilyMemberAvatar(
  memberId: string,
  familyId: string,
  avatarEmoji: string
): Promise<FamilyMember> {
  const db = getDb();

  const [row] = await db
    .update(familyMembers)
    .set({ avatarEmoji })
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.familyId, familyId)))
    .returning();

  if (!row) {
    throw new Error(`Family member ${memberId} not found`);
  }

  return mapMember(row);
}

export type UpdateFamilyMemberInput = Partial<{
  name: string;
  shortName: string;
  nickname: string;
  colour: string;
  avatarEmoji: string;
  role: "adult" | "teen" | "child" | "pet";
  title: string;
}>;

/** Scoped to `familyId` so one household can't edit another's member by guessing an id. */
export async function updateFamilyMember(
  memberId: string,
  familyId: string,
  input: UpdateFamilyMemberInput
): Promise<FamilyMember> {
  const db = getDb();

  const [row] = await db
    .update(familyMembers)
    .set(input)
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.familyId, familyId)))
    .returning();

  if (!row) {
    throw new Error(`Family member ${memberId} not found`);
  }

  return mapMember(row);
}

/**
 * Marks a family member's profile as just having been made active — powers
 * the "Last visit" line on their Profile screen. Fire-and-forget from the UI
 * (see handleSelectUser in ground-control-app.tsx); failures are non-fatal.
 */
export async function touchMemberLastSeen(memberId: string, familyId: string): Promise<void> {
  const db = getDb();
  await db
    .update(familyMembers)
    .set({ lastSeenAt: new Date() })
    .where(and(eq(familyMembers.id, memberId), eq(familyMembers.familyId, familyId)));
}

/**
 * Raw member row (including familyId/userId) for server-only use — e.g. the
 * invite-link claim flow, which needs to check `userId` before allowing a
 * profile to be "connected" to a new login. Never expose `userId` to the
 * client directly; use `mapMember`'s `hasAccount` boolean for that.
 */
export async function getFamilyMemberRawById(memberId: string): Promise<MemberRow | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.id, memberId))
    .limit(1);
  return row ?? null;
}

export type NewEventInput = {
  familyId: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  personIds: string[];
  category: string;
  location?: string;
  icon?: string;
  accentColor?: string;
  source?: string;
  customServiceId?: string;
  isDemo?: boolean;
};

export async function createEvent(input: NewEventInput): Promise<Event> {
  const db = getDb();
  // A manually-created event's category decides which module "owns" it (e.g.
  // picking a Bills category tags it to the Bills module) — falls back to the
  // core planner module for the generic categories (family/appointment/...).
  const moduleKey = getModuleByCategory(input.category)?.key ?? "planner";
  const moduleId = await getModuleId(moduleKey);

  const [row] = await db
    .insert(events)
    .values({
      familyId: input.familyId,
      moduleId,
      customServiceId: input.customServiceId,
      title: input.title,
      description: input.description,
      start: new Date(input.start),
      end: input.end ? new Date(input.end) : undefined,
      allDay: input.allDay ?? false,
      category: input.category,
      personIds: input.personIds,
      location: input.location,
      icon: input.icon,
      accentColor: input.accentColor,
      source: input.source ?? "manual",
      isDemo: input.isDemo ?? false,
    })
    .returning();

  return mapEvent(row, moduleKey);
}

export type UpdateEventInput = {
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  personIds: string[];
  category: string;
  location?: string;
  icon?: string;
  accentColor?: string;
  customServiceId?: string;
};

/**
 * Updates an existing manually-created event (see EventDetailModal). Since
 * the category can change, this recomputes moduleKey/moduleId exactly like
 * createEvent does, so the event's module-visibility filtering stays correct.
 */
export async function updateEvent(
  id: string,
  familyId: string,
  input: UpdateEventInput
): Promise<Event> {
  const db = getDb();
  const moduleKey = getModuleByCategory(input.category)?.key ?? "planner";
  const moduleId = await getModuleId(moduleKey);

  const [row] = await db
    .update(events)
    .set({
      moduleId,
      customServiceId: input.customServiceId,
      title: input.title,
      description: input.description,
      start: new Date(input.start),
      end: input.end ? new Date(input.end) : null,
      allDay: input.allDay ?? false,
      category: input.category,
      personIds: input.personIds,
      location: input.location,
      icon: input.icon,
      accentColor: input.accentColor,
      updatedAt: new Date(),
    })
    .where(and(eq(events.id, id), eq(events.familyId, familyId)))
    .returning();

  if (!row) {
    throw new Error(`Event ${id} not found`);
  }

  return mapEvent(row, moduleKey);
}

/** Scoped to `familyId` so one household can't delete another's event by guessing an id. */
export async function deleteEvent(id: string, familyId: string): Promise<void> {
  const db = getDb();
  await db.delete(events).where(and(eq(events.id, id), eq(events.familyId, familyId)));
}

/** Swipe "Hide" — dismisses an event from calendar views without deleting it. */
export async function hideEvent(id: string, familyId: string): Promise<Event> {
  const db = getDb();
  const [row] = await db
    .update(events)
    .set({ hiddenAt: new Date(), updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.familyId, familyId)))
    .returning();

  if (!row) {
    throw new Error(`Event ${id} not found`);
  }

  return mapEvent(row, getModuleByCategory(row.category)?.key ?? "planner");
}

/** Swipe "Snooze" — hides an event from calendar views until `snoozeUntil`. */
export async function snoozeEvent(
  id: string,
  familyId: string,
  snoozeUntil: string
): Promise<Event> {
  const db = getDb();
  const [row] = await db
    .update(events)
    .set({ snoozedUntil: new Date(snoozeUntil), updatedAt: new Date() })
    .where(and(eq(events.id, id), eq(events.familyId, familyId)))
    .returning();

  if (!row) {
    throw new Error(`Event ${id} not found`);
  }

  return mapEvent(row, getModuleByCategory(row.category)?.key ?? "planner");
}

export type NewBoardItemInput = {
  familyId: string;
  text: string;
  type?: "note" | "task" | "reminder" | "countdown";
  personIds?: string[];
  pinned?: boolean;
  badge?: string;
  color?: string;
  customServiceId?: string;
  isDemo?: boolean;
};

export async function createBoardItem(input: NewBoardItemInput): Promise<BoardItem> {
  const db = getDb();
  const moduleId = await getModuleId("board");

  const [row] = await db
    .insert(boardItems)
    .values({
      familyId: input.familyId,
      moduleId,
      customServiceId: input.customServiceId,
      text: input.text,
      type: input.type ?? "note",
      personIds: input.personIds ?? [],
      pinned: input.pinned ?? false,
      badge: input.badge,
      color: input.color,
      isDemo: input.isDemo ?? false,
    })
    .returning();

  return mapBoardItem(row, "board");
}

export type UpdateBoardItemInput = {
  text: string;
  type?: "note" | "task" | "reminder" | "countdown";
  personIds?: string[];
  pinned?: boolean;
  badge?: string;
  color?: string;
  customServiceId?: string;
};

/**
 * Updates an existing board item's text/details (note, task, or reminder).
 * Mirrors updateEvent's approach for events.
 */
/** Scoped to `familyId` so one household can't edit another's board item by guessing an id. */
export async function updateBoardItem(
  id: string,
  familyId: string,
  input: UpdateBoardItemInput
): Promise<BoardItem> {
  const db = getDb();

  const [row] = await db
    .update(boardItems)
    .set({
      text: input.text,
      type: input.type,
      personIds: input.personIds,
      pinned: input.pinned,
      badge: input.badge,
      color: input.color,
      customServiceId: input.customServiceId,
    })
    .where(and(eq(boardItems.id, id), eq(boardItems.familyId, familyId)))
    .returning();

  if (!row) {
    throw new Error(`Board item ${id} not found`);
  }

  return mapBoardItem(row, "board");
}

/** Scoped to `familyId` so one household can't toggle another's board item by guessing an id. */
export async function toggleBoardItem(id: string, familyId: string): Promise<BoardItem> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(boardItems)
    .where(and(eq(boardItems.id, id), eq(boardItems.familyId, familyId)))
    .limit(1);

  if (!existing) {
    throw new Error(`Board item ${id} not found`);
  }

  const [row] = await db
    .update(boardItems)
    .set({ completed: !existing.completed })
    .where(eq(boardItems.id, id))
    .returning();

  return mapBoardItem(row);
}

/** Scoped to `familyId` so one household can't delete another's board item by guessing an id. */
export async function removeBoardItem(id: string, familyId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(boardItems)
    .where(and(eq(boardItems.id, id), eq(boardItems.familyId, familyId)));
}

/**
 * Merges the code-level module registry (name/description/icon/isCore) with
 * this family's `family_modules` rows (enabled/disabled), then appends any
 * admin-created custom modules (`modules.isCustom = true`) that have been
 * explicitly assigned to this family — i.e. a `family_modules` row exists
 * for them. Unlike registry modules (available to every family by default),
 * a custom module simply doesn't appear at all until assigned. A registry
 * module the family has never toggled defaults to on for core modules, off
 * for everything else — matching what `createFamilyWithOwner` seeds for new
 * signups.
 */
export async function getFamilyModules(familyId: string): Promise<GroundControlModule[]> {
  const db = getDb();

  const [moduleRows, familyModuleRows] = await Promise.all([
    db.select().from(modules),
    db
      .select()
      .from(familyModules)
      .where(eq(familyModules.familyId, familyId)),
  ]);

  const dbModuleByKey = new Map(moduleRows.map((m) => [m.key, m]));
  const familyModuleByModuleId = new Map(familyModuleRows.map((fm) => [fm.moduleId, fm]));

  const registryModules: GroundControlModule[] = moduleRegistry.map((def) => {
    const dbModule = dbModuleByKey.get(def.key);
    const familyModule = dbModule ? familyModuleByModuleId.get(dbModule.id) : undefined;
    const enabled = familyModule ? familyModule.enabled : def.isCore;
    const config = (familyModule?.config as Record<string, unknown>) ?? {};

    const visibleToMemberIds = Array.isArray(config.visibleToMemberIds)
      ? (config.visibleToMemberIds as string[])
      : undefined;

    return {
      id: dbModule?.id ?? def.key,
      key: def.key,
      name: def.name,
      description: def.description,
      enabled,
      isCore: def.isCore,
      status: def.isCore ? "installed" : enabled ? "installed" : "available",
      icon: def.icon,
      feeds: readModuleFeeds(config),
      visibleToMemberIds,
    };
  });

  const customModules: GroundControlModule[] = moduleRows
    .filter((m) => m.isCustom)
    .map((dbModule) => {
      const familyModule = familyModuleByModuleId.get(dbModule.id);
      if (!familyModule) return undefined;

      const enabled = familyModule.enabled;
      const config = (familyModule.config as Record<string, unknown>) ?? {};
      const visibleToMemberIds = Array.isArray(config.visibleToMemberIds)
        ? (config.visibleToMemberIds as string[])
        : undefined;

      const custom: GroundControlModule = {
        id: dbModule.id,
        key: dbModule.key,
        name: dbModule.name,
        description: dbModule.description ?? "",
        enabled,
        isCore: false,
        isCustom: true,
        status: enabled ? "installed" : "available",
        icon: dbModule.icon ?? undefined,
        colour: dbModule.colour ?? undefined,
        feeds: readModuleFeeds(config),
        visibleToMemberIds,
      };
      return custom;
    })
    .filter((m): m is GroundControlModule => m !== undefined);

  return [...registryModules, ...customModules];
}

/**
 * Sets which family members can see an (optional) module's data — an empty
 * array means "everyone" (the default). Adults always see everything
 * regardless of this setting; filtering only ever applies to non-adult
 * current users (see ground-control-app.tsx).
 */
export async function setModuleVisibility(
  familyId: string,
  moduleKey: string,
  memberIds: string[]
): Promise<void> {
  const moduleId = await getModuleId(moduleKey);
  if (!moduleId) {
    throw new Error(`Unknown module key: ${moduleKey}`);
  }

  const db = getDb();
  const row = await getOrCreateFamilyModuleRow(familyId, moduleId, false);
  const config = (row.config as Record<string, unknown>) ?? {};
  const newConfig: Record<string, unknown> = { ...config, visibleToMemberIds: memberIds };
  await db.update(familyModules).set({ config: newConfig }).where(eq(familyModules.id, row.id));
}

export async function setFamilyModuleEnabled(
  familyId: string,
  moduleKey: string,
  enabled: boolean
): Promise<void> {
  const moduleId = await getModuleId(moduleKey);
  if (!moduleId) {
    throw new Error(`Unknown module key: ${moduleKey}`);
  }

  const db = getDb();
  const [existing] = await db
    .select({ id: familyModules.id })
    .from(familyModules)
    .where(and(eq(familyModules.familyId, familyId), eq(familyModules.moduleId, moduleId)))
    .limit(1);

  if (existing) {
    await db
      .update(familyModules)
      .set({ enabled })
      .where(eq(familyModules.id, existing.id));
  } else {
    await db.insert(familyModules).values({ familyId, moduleId, enabled });
  }
}

async function getOrCreateFamilyModuleRow(
  familyId: string,
  moduleId: string,
  defaultEnabled: boolean
) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(familyModules)
    .where(and(eq(familyModules.familyId, familyId), eq(familyModules.moduleId, moduleId)))
    .limit(1);

  if (existing) return existing;

  const [inserted] = await db
    .insert(familyModules)
    .values({ familyId, moduleId, enabled: defaultEnabled })
    .returning();
  return inserted;
}

/**
 * Adds a new calendar feed, or updates an existing one (by id), for a
 * household's module (e.g. Sports, School). Modules support multiple feeds —
 * e.g. one per kid/team — each with its own label + URL, stored as
 * `family_modules.config.feeds`.
 */
export async function saveModuleFeed(
  familyId: string,
  moduleKey: string,
  feed: { id?: string; label: string; url: string; personIds?: string[] }
): Promise<ModuleFeed> {
  const moduleId = await getModuleId(moduleKey);
  if (!moduleId) {
    throw new Error(`Unknown module key: ${moduleKey}`);
  }

  const db = getDb();
  const row = await getOrCreateFamilyModuleRow(familyId, moduleId, false);
  const config = (row.config as Record<string, unknown>) ?? {};
  const feeds = readModuleFeeds(config);

  let saved: ModuleFeed;
  const existingIndex = feed.id ? feeds.findIndex((f) => f.id === feed.id) : -1;
  if (existingIndex >= 0) {
    saved = {
      ...feeds[existingIndex],
      label: feed.label,
      url: feed.url,
      personIds: feed.personIds ?? feeds[existingIndex].personIds,
    };
    feeds[existingIndex] = saved;
  } else {
    saved = { id: randomUUID(), label: feed.label, url: feed.url, personIds: feed.personIds ?? [] };
    feeds.push(saved);
  }

  const newConfig: Record<string, unknown> = { ...config, feeds };
  delete newConfig.feedUrl;
  delete newConfig.lastSyncedAt;
  await db.update(familyModules).set({ config: newConfig }).where(eq(familyModules.id, row.id));
  return saved;
}

/**
 * Removes a single calendar feed from a module's config. Any events already
 * synced from it are left in place (they simply stop updating).
 */
export async function removeModuleFeed(
  familyId: string,
  moduleKey: string,
  feedId: string
): Promise<void> {
  const moduleId = await getModuleId(moduleKey);
  if (!moduleId) {
    throw new Error(`Unknown module key: ${moduleKey}`);
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(familyModules)
    .where(and(eq(familyModules.familyId, familyId), eq(familyModules.moduleId, moduleId)))
    .limit(1);
  if (!row) return;

  const config = (row.config as Record<string, unknown>) ?? {};
  const feeds = readModuleFeeds(config).filter((f) => f.id !== feedId);
  const newConfig: Record<string, unknown> = { ...config, feeds };
  delete newConfig.feedUrl;
  delete newConfig.lastSyncedAt;
  await db.update(familyModules).set({ config: newConfig }).where(eq(familyModules.id, row.id));
}

export type SyncModuleFeedResult = {
  events: Event[];
  createdCount: number;
  updatedCount: number;
  lastSyncedAt: string;
};

/**
 * Fetches one specific configured feed (by id) for `moduleKey`, parses it as
 * iCal, and upserts events into the core `events` table — matching existing
 * rows by (familyId, source=moduleKey, sourceId=`feedId::iCal UID`) so
 * re-syncing updates rather than duplicates, and separate feeds on the same
 * module (e.g. two kids' sports calendars) never collide with each other.
 */
export async function syncModuleFeed(
  familyId: string,
  moduleKey: string,
  feedId: string
): Promise<SyncModuleFeedResult> {
  const moduleId = await getModuleId(moduleKey);
  if (!moduleId) {
    throw new Error(`Unknown module key: ${moduleKey}`);
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(familyModules)
    .where(and(eq(familyModules.familyId, familyId), eq(familyModules.moduleId, moduleId)))
    .limit(1);

  const config = (row?.config as Record<string, unknown>) ?? {};
  const feeds = readModuleFeeds(config);
  const feedIndex = feeds.findIndex((f) => f.id === feedId);
  const feed = feedIndex >= 0 ? feeds[feedIndex] : undefined;
  if (!feed || !feed.url) {
    throw new Error("No calendar feed URL set for this feed yet");
  }

  const connectorEvents = await parseIcalFeed(feed.url);
  const sourcePrefix = `${feedId}::`;

  let createdCount = 0;
  let updatedCount = 0;
  const syncedEvents: Event[] = [];

  for (const ce of connectorEvents) {
    const sourceId = `${sourcePrefix}${ce.uid}`;
    const [existingEvent] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.familyId, familyId),
          eq(events.source, moduleKey),
          eq(events.sourceId, sourceId)
        )
      )
      .limit(1);

    if (existingEvent) {
      const [updated] = await db
        .update(events)
        .set({
          title: ce.title,
          description: ce.description,
          start: new Date(ce.start),
          end: ce.end ? new Date(ce.end) : null,
          allDay: ce.allDay,
          location: ce.location,
          updatedAt: new Date(),
        })
        .where(eq(events.id, existingEvent.id))
        .returning();
      syncedEvents.push(mapEvent(updated, moduleKey));
      updatedCount++;
    } else {
      const [inserted] = await db
        .insert(events)
        .values({
          familyId,
          moduleId,
          title: ce.title,
          description: ce.description,
          start: new Date(ce.start),
          end: ce.end ? new Date(ce.end) : undefined,
          allDay: ce.allDay,
          category: moduleKey,
          personIds: feed.personIds ?? [],
          location: ce.location,
          source: moduleKey,
          sourceId,
        })
        .returning();
      syncedEvents.push(mapEvent(inserted, moduleKey));
      createdCount++;
    }
  }

  const lastSyncedAt = new Date().toISOString();
  feeds[feedIndex] = { ...feed, lastSyncedAt };
  const newConfig: Record<string, unknown> = { ...config, feeds };
  delete newConfig.feedUrl;
  delete newConfig.lastSyncedAt;
  if (row) {
    await db.update(familyModules).set({ config: newConfig }).where(eq(familyModules.id, row.id));
  } else {
    await db.insert(familyModules).values({ familyId, moduleId, enabled: true, config: newConfig });
  }

  return { events: syncedEvents, createdCount, updatedCount, lastSyncedAt };
}

// ---------------------------------------------------------------------------
// Demo / starter data — created once for a brand new family at signup so the
// app isn't an empty shell on first login, and removable in one tap later
// from the Family Admin screen (see removeDemoData below).
// ---------------------------------------------------------------------------

/**
 * Seeds a couple of `isDemo: true` items for a newly-signed-up family: a
 * pinned "Add to Home Screen" note (with iPhone/Android instructions) and a
 * sample event + task so Today/Week/Remember aren't empty on first login.
 * Called once from `createFamilyWithOwner` (db/auth-queries.ts). Never
 * touches personIds/visibility — demo items are visible to everyone.
 */
export async function seedDemoDataForFamily(
  familyId: string,
  ownerMemberId: string
): Promise<void> {
  const db = getDb();
  const plannerModuleId = await getModuleId("planner");
  const boardModuleId = await getModuleId("board");

  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  tomorrow.setHours(9, 0, 0, 0);

  await db.insert(boardItems).values({
    familyId,
    moduleId: boardModuleId,
    text: "📱 Add Ground Control to your Home Screen",
    subtitle:
      "iPhone: tap the Share icon in Safari, then \"Add to Home Screen\". " +
      "Android: open the ⋮ menu in Chrome, then \"Add to Home screen\" (or \"Install app\").",
    type: "note",
    personIds: [],
    pinned: true,
    badge: "📌",
    color: "#FFF4D2",
    isDemo: true,
  });

  await db.insert(boardItems).values({
    familyId,
    moduleId: boardModuleId,
    text: "Try adding your first task",
    subtitle: "Tap the + button below to add an event, task, note or reminder.",
    type: "task",
    personIds: [ownerMemberId],
    pinned: false,
    badge: "✓",
    color: "#E6FAF4",
    isDemo: true,
  });

  await db.insert(events).values({
    familyId,
    moduleId: plannerModuleId,
    title: "Welcome to Ground Control 🚀",
    description: "This is a sample event — feel free to delete it once you've had a look around.",
    start: tomorrow,
    allDay: false,
    category: "general",
    personIds: [ownerMemberId],
    icon: "✨",
    accentColor: "#6C4DFF",
    source: "manual",
    isDemo: true,
  });
}

export type RemoveDemoDataResult = {
  removedEvents: number;
  removedBoardItems: number;
};

/**
 * Bulk-deletes every `isDemo: true` event/board item for a family — the
 * "Remove demo data" button in Family Admin. Scoped to `familyId` so one
 * household can never affect another's data.
 */
export async function removeDemoData(familyId: string): Promise<RemoveDemoDataResult> {
  const db = getDb();
  const [removedEvents, removedBoardItems] = await Promise.all([
    db
      .delete(events)
      .where(and(eq(events.familyId, familyId), eq(events.isDemo, true)))
      .returning({ id: events.id }),
    db
      .delete(boardItems)
      .where(and(eq(boardItems.familyId, familyId), eq(boardItems.isDemo, true)))
      .returning({ id: boardItems.id }),
  ]);

  return { removedEvents: removedEvents.length, removedBoardItems: removedBoardItems.length };
}
