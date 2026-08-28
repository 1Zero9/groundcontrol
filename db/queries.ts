import { and, asc, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { boardItems, events, familyMembers, familyModules, families, modules } from "./schema";
import { moduleRegistry } from "../src/core/module-registry";
import { parseIcalFeed } from "../src/core/connectors";
import { listCustomServices } from "./custom-services-queries";
import type { BoardItem, Event, FamilyMember, GroundControlModule } from "../src/core/models";

type MemberRow = typeof familyMembers.$inferSelect;
type EventRow = typeof events.$inferSelect;
type BoardItemRow = typeof boardItems.$inferSelect;

function mapMember(row: MemberRow): FamilyMember {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    shortName: row.shortName ?? undefined,
    colour: row.colour,
    avatarEmoji: row.avatarEmoji ?? undefined,
    role: row.role,
    title: row.title ?? undefined,
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
    details: (row.details as Record<string, unknown>) ?? undefined,
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
  };
}

async function getModuleId(key: string): Promise<string | undefined> {
  const db = getDb();
  const [row] = await db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.key, key))
    .limit(1);
  return row?.id;
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

export async function updateFamilyMemberAvatar(
  memberId: string,
  avatarEmoji: string
): Promise<FamilyMember> {
  const db = getDb();

  const [row] = await db
    .update(familyMembers)
    .set({ avatarEmoji })
    .where(eq(familyMembers.id, memberId))
    .returning();

  return mapMember(row);
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
};

export async function createEvent(input: NewEventInput): Promise<Event> {
  const db = getDb();
  const moduleId = await getModuleId("planner");

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
    })
    .returning();

  return mapEvent(row, "planner");
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
    })
    .returning();

  return mapBoardItem(row, "board");
}

export async function toggleBoardItem(id: string): Promise<BoardItem> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(boardItems)
    .where(eq(boardItems.id, id))
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

export async function removeBoardItem(id: string): Promise<void> {
  const db = getDb();
  await db.delete(boardItems).where(eq(boardItems.id, id));
}

/**
 * Merges the code-level module registry (name/description/icon/isCore) with
 * this family's `family_modules` rows (enabled/disabled). A module the
 * family has never toggled simply defaults to on for core modules, off for
 * everything else — matching what `createFamilyWithOwner` seeds for new
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

  return moduleRegistry.map((def) => {
    const dbModule = dbModuleByKey.get(def.key);
    const familyModule = dbModule ? familyModuleByModuleId.get(dbModule.id) : undefined;
    const enabled = familyModule ? familyModule.enabled : def.isCore;
    const config = (familyModule?.config as Record<string, unknown>) ?? {};

    return {
      id: dbModule?.id ?? def.key,
      key: def.key,
      name: def.name,
      description: def.description,
      enabled,
      isCore: def.isCore,
      status: def.isCore ? "installed" : enabled ? "installed" : "available",
      icon: def.icon,
      feedUrl: typeof config.feedUrl === "string" ? config.feedUrl : undefined,
      lastSyncedAt: typeof config.lastSyncedAt === "string" ? config.lastSyncedAt : undefined,
    };
  });
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
 * Saves the calendar feed (iCal/webcal) URL a household wants a module
 * (e.g. Sports, School) to sync events from. Stored in `family_modules.config`
 * rather than a dedicated column, since it's module-specific configuration.
 */
export async function setModuleFeedUrl(
  familyId: string,
  moduleKey: string,
  feedUrl: string
): Promise<void> {
  const moduleId = await getModuleId(moduleKey);
  if (!moduleId) {
    throw new Error(`Unknown module key: ${moduleKey}`);
  }

  const db = getDb();
  const row = await getOrCreateFamilyModuleRow(familyId, moduleId, false);
  const config = { ...((row.config as Record<string, unknown>) ?? {}), feedUrl };
  await db.update(familyModules).set({ config }).where(eq(familyModules.id, row.id));
}

export type SyncModuleFeedResult = {
  events: Event[];
  createdCount: number;
  updatedCount: number;
  lastSyncedAt: string;
};

/**
 * Fetches this family's configured feed URL for `moduleKey`, parses it as
 * iCal, and upserts events into the core `events` table — matching existing
 * rows by (familyId, source=moduleKey, sourceId=iCal UID) so re-syncing
 * updates rather than duplicates.
 */
export async function syncModuleFeed(
  familyId: string,
  moduleKey: string
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
  const feedUrl = typeof config.feedUrl === "string" ? config.feedUrl : undefined;
  if (!feedUrl) {
    throw new Error("No calendar feed URL set for this module yet");
  }

  const connectorEvents = await parseIcalFeed(feedUrl);

  let createdCount = 0;
  let updatedCount = 0;
  const syncedEvents: Event[] = [];

  for (const ce of connectorEvents) {
    const [existingEvent] = await db
      .select()
      .from(events)
      .where(
        and(
          eq(events.familyId, familyId),
          eq(events.source, moduleKey),
          eq(events.sourceId, ce.uid)
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
          personIds: [],
          location: ce.location,
          source: moduleKey,
          sourceId: ce.uid,
        })
        .returning();
      syncedEvents.push(mapEvent(inserted, moduleKey));
      createdCount++;
    }
  }

  const lastSyncedAt = new Date().toISOString();
  const newConfig = { ...config, lastSyncedAt };
  if (row) {
    await db.update(familyModules).set({ config: newConfig }).where(eq(familyModules.id, row.id));
  } else {
    await db.insert(familyModules).values({ familyId, moduleId, enabled: true, config: newConfig });
  }

  return { events: syncedEvents, createdCount, updatedCount, lastSyncedAt };
}
