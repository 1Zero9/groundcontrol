import { and, eq } from "drizzle-orm";
import { getDb } from "./index";
import { customServices, events } from "./schema";
import { parseIcalFeed } from "../src/core/connectors";
import type { Event } from "../src/core/models";

/**
 * CUSTOM SERVICES
 * ---------------
 * Family-defined, ad-hoc "services" (a college schedule, a one-off
 * tournament, a club that isn't one of the built-in modules) — created at
 * runtime per family, unlike the fixed code-registry in
 * `src/core/module-registry.ts`. Optionally backed by an iCal/webcal feed
 * (synced the same upsert-by-UID way as a module's feed via
 * `syncModuleFeed` in db/queries.ts); with no feed it's just a label a
 * manually-added event/board item can be tagged with.
 */

export type CustomService = {
  id: string;
  familyId: string;
  name: string;
  icon?: string;
  colour?: string;
  feedUrl?: string;
  lastSyncedAt?: string;
  createdAt: string;
};

type CustomServiceRow = typeof customServices.$inferSelect;

function mapCustomService(row: CustomServiceRow): CustomService {
  return {
    id: row.id,
    familyId: row.familyId,
    name: row.name,
    icon: row.icon ?? undefined,
    colour: row.colour ?? undefined,
    feedUrl: row.feedUrl ?? undefined,
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listCustomServices(familyId: string): Promise<CustomService[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(customServices)
    .where(eq(customServices.familyId, familyId));
  return rows.map(mapCustomService);
}

export type NewCustomServiceInput = {
  familyId: string;
  name: string;
  icon?: string;
  colour?: string;
  feedUrl?: string;
};

export async function createCustomService(input: NewCustomServiceInput): Promise<CustomService> {
  const db = getDb();
  const [row] = await db
    .insert(customServices)
    .values({
      familyId: input.familyId,
      name: input.name.trim(),
      icon: input.icon,
      colour: input.colour,
      feedUrl: input.feedUrl?.trim() || undefined,
    })
    .returning();
  return mapCustomService(row);
}

/** Scoped to `familyId` so one household can't delete another's service by guessing an id. */
export async function deleteCustomService(id: string, familyId: string): Promise<void> {
  const db = getDb();
  await db
    .delete(customServices)
    .where(and(eq(customServices.id, id), eq(customServices.familyId, familyId)));
}

export async function setCustomServiceFeedUrl(
  id: string,
  familyId: string,
  feedUrl: string
): Promise<void> {
  const db = getDb();
  await db
    .update(customServices)
    .set({ feedUrl: feedUrl.trim() })
    .where(and(eq(customServices.id, id), eq(customServices.familyId, familyId)));
}

export type SyncCustomServiceFeedResult = {
  events: Event[];
  createdCount: number;
  updatedCount: number;
  lastSyncedAt: string;
};

function mapSyncedEvent(row: typeof events.$inferSelect): Event {
  return {
    id: row.id,
    familyId: row.familyId,
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
    customServiceId: row.customServiceId ?? undefined,
  };
}

/**
 * Fetches a custom service's feed URL, parses it as iCal, and upserts
 * events into the core `events` table — matching existing rows by
 * (familyId, customServiceId, sourceId=iCal UID) so re-syncing updates
 * rather than duplicates. Mirrors `syncModuleFeed` in db/queries.ts.
 */
export async function syncCustomServiceFeed(
  familyId: string,
  serviceId: string
): Promise<SyncCustomServiceFeedResult> {
  const db = getDb();
  const [service] = await db
    .select()
    .from(customServices)
    .where(and(eq(customServices.id, serviceId), eq(customServices.familyId, familyId)))
    .limit(1);

  if (!service) {
    throw new Error("Service not found");
  }
  if (!service.feedUrl) {
    throw new Error("No calendar feed URL set for this service yet");
  }

  const connectorEvents = await parseIcalFeed(service.feedUrl);

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
          eq(events.customServiceId, serviceId),
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
      syncedEvents.push(mapSyncedEvent(updated));
      updatedCount++;
    } else {
      const [inserted] = await db
        .insert(events)
        .values({
          familyId,
          customServiceId: serviceId,
          title: ce.title,
          description: ce.description,
          start: new Date(ce.start),
          end: ce.end ? new Date(ce.end) : undefined,
          allDay: ce.allDay,
          category: "custom",
          icon: service.icon ?? undefined,
          accentColor: service.colour ?? undefined,
          personIds: [],
          location: ce.location,
          source: "custom",
          sourceId: ce.uid,
        })
        .returning();
      syncedEvents.push(mapSyncedEvent(inserted));
      createdCount++;
    }
  }

  const lastSyncedAt = new Date();
  await db
    .update(customServices)
    .set({ lastSyncedAt })
    .where(eq(customServices.id, serviceId));

  return {
    events: syncedEvents,
    createdCount,
    updatedCount,
    lastSyncedAt: lastSyncedAt.toISOString(),
  };
}
