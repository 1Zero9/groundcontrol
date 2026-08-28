"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/auth/admin";
import {
  setFamilyModuleEnabled,
  setModuleFeedUrl,
  syncModuleFeed,
} from "../../db/queries";

/**
 * Admin Server Actions — every one calls `requireAdmin()` first and only
 * ever delegates to module/connector-config functions (never event/board
 * reads or writes), so this file can't be used to see or edit a household's
 * personal calendar/notes even by an admin. See docs/TECHNICAL.md §9.
 */

export async function adminSetModuleEnabledAction(
  familyId: string,
  moduleKey: string,
  enabled: boolean
) {
  await requireAdmin();
  await setFamilyModuleEnabled(familyId, moduleKey, enabled);
  revalidatePath("/admin");
}

export async function adminSaveModuleFeedUrlAction(
  familyId: string,
  moduleKey: string,
  feedUrl: string
) {
  await requireAdmin();
  await setModuleFeedUrl(familyId, moduleKey, feedUrl);
  revalidatePath("/admin");
}

export async function adminSyncModuleFeedAction(familyId: string, moduleKey: string) {
  await requireAdmin();
  const result = await syncModuleFeed(familyId, moduleKey);
  revalidatePath("/admin");
  return {
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
    lastSyncedAt: result.lastSyncedAt,
  };
}
