"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../lib/auth/admin";
import {
  removeModuleFeed,
  saveModuleFeed,
  setFamilyModuleEnabled,
  syncModuleFeed,
} from "../../db/queries";
import {
  createCustomModule,
  deleteCustomModule,
  renameFamily,
  resetFamilyLogin,
  resolveModuleRequest,
  setCustomModuleAssignment,
  updateCustomModule,
  type CustomModuleUpdateInput,
  type NewCustomModuleInput,
} from "../../db/admin-queries";
import {
  createCustomService,
  deleteCustomService,
  setCustomServiceFeedUrl,
  syncCustomServiceFeed,
  type NewCustomServiceInput,
} from "../../db/custom-services-queries";
import { discoverCalendarFeeds } from "../../src/core/calendar-discovery";
import { hashPassword } from "../../lib/auth/password";

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

export async function adminSaveModuleFeedAction(
  familyId: string,
  moduleKey: string,
  feed: { id?: string; label: string; url: string }
) {
  await requireAdmin();
  const saved = await saveModuleFeed(familyId, moduleKey, feed);
  revalidatePath("/admin");
  return saved;
}

export async function adminRemoveModuleFeedAction(
  familyId: string,
  moduleKey: string,
  feedId: string
) {
  await requireAdmin();
  await removeModuleFeed(familyId, moduleKey, feedId);
  revalidatePath("/admin");
}

export async function adminSyncModuleFeedAction(
  familyId: string,
  moduleKey: string,
  feedId: string
) {
  await requireAdmin();
  const result = await syncModuleFeed(familyId, moduleKey, feedId);
  revalidatePath("/admin");
  return {
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
    lastSyncedAt: result.lastSyncedAt,
  };
}

export async function adminRenameFamilyAction(familyId: string, name: string) {
  await requireAdmin();
  await renameFamily(familyId, name);
  revalidatePath("/admin");
}

export async function adminResetFamilyLoginAction(
  familyId: string,
  email: string,
  password: string
) {
  await requireAdmin();
  const passwordHash = hashPassword(password);
  await resetFamilyLogin(familyId, email, passwordHash);
  revalidatePath("/admin");
}

export async function adminCreateCustomServiceAction(input: NewCustomServiceInput) {
  await requireAdmin();
  const service = await createCustomService(input);
  revalidatePath("/admin");
  return service;
}

export async function adminDeleteCustomServiceAction(id: string, familyId: string) {
  await requireAdmin();
  await deleteCustomService(id, familyId);
  revalidatePath("/admin");
}

export async function adminSaveCustomServiceFeedUrlAction(
  id: string,
  familyId: string,
  feedUrl: string
) {
  await requireAdmin();
  await setCustomServiceFeedUrl(id, familyId, feedUrl);
  revalidatePath("/admin");
}

export async function adminSyncCustomServiceFeedAction(familyId: string, serviceId: string) {
  await requireAdmin();
  const result = await syncCustomServiceFeed(familyId, serviceId);
  revalidatePath("/admin");
  return {
    createdCount: result.createdCount,
    updatedCount: result.updatedCount,
    lastSyncedAt: result.lastSyncedAt,
  };
}

export async function adminDiscoverCalendarFeedsAction(pageUrl: string) {
  await requireAdmin();
  return discoverCalendarFeeds(pageUrl);
}

export async function adminCreateCustomModuleAction(input: NewCustomModuleInput) {
  await requireAdmin();
  const created = await createCustomModule(input);
  revalidatePath("/admin");
  return created;
}

export async function adminUpdateCustomModuleAction(
  moduleId: string,
  input: CustomModuleUpdateInput
) {
  await requireAdmin();
  await updateCustomModule(moduleId, input);
  revalidatePath("/admin");
}

export async function adminDeleteCustomModuleAction(moduleId: string) {
  await requireAdmin();
  await deleteCustomModule(moduleId);
  revalidatePath("/admin");
}

export async function adminSetCustomModuleAssignmentAction(
  moduleId: string,
  familyId: string,
  assigned: boolean
) {
  await requireAdmin();
  await setCustomModuleAssignment(moduleId, familyId, assigned);
  revalidatePath("/admin");
}

export async function adminResolveModuleRequestAction(
  requestId: string,
  status: "approved" | "declined",
  adminNote?: string
) {
  await requireAdmin();
  await resolveModuleRequest(requestId, status, adminNote);
  revalidatePath("/admin");
}
