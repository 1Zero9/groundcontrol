import { desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { moduleRequests } from "./schema";

/**
 * MODULE REQUESTS
 * ---------------
 * A lightweight "ask the admin for a module" queue. A family submits a
 * title + optional reason; the admin reviews it in /admin and marks it
 * approved/declined (see db/admin-queries.ts). Approving here doesn't
 * automatically create or assign anything — the admin still does that as a
 * separate step via the Module Catalog — this table only tracks the ask and
 * its outcome so the family can see what happened to their request.
 */

export type ModuleRequest = {
  id: string;
  familyId: string;
  requestedByName?: string;
  title: string;
  reason?: string;
  status: "pending" | "approved" | "declined";
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string;
};

type ModuleRequestRow = typeof moduleRequests.$inferSelect;

function mapModuleRequest(row: ModuleRequestRow): ModuleRequest {
  return {
    id: row.id,
    familyId: row.familyId,
    requestedByName: row.requestedByName ?? undefined,
    title: row.title,
    reason: row.reason ?? undefined,
    status: row.status,
    adminNote: row.adminNote ?? undefined,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : undefined,
  };
}

export type NewModuleRequestInput = {
  familyId: string;
  requestedByName?: string;
  title: string;
  reason?: string;
};

export async function createModuleRequest(
  input: NewModuleRequestInput
): Promise<ModuleRequest> {
  const db = getDb();
  const [row] = await db
    .insert(moduleRequests)
    .values({
      familyId: input.familyId,
      requestedByName: input.requestedByName,
      title: input.title.trim(),
      reason: input.reason?.trim() || undefined,
    })
    .returning();
  return mapModuleRequest(row);
}

export async function listModuleRequestsForFamily(
  familyId: string
): Promise<ModuleRequest[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(moduleRequests)
    .where(eq(moduleRequests.familyId, familyId))
    .orderBy(desc(moduleRequests.createdAt));
  return rows.map(mapModuleRequest);
}
