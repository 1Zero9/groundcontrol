"use server";

import { revalidatePath } from "next/cache";
import {
  createBoardItem,
  createEvent,
  createFamilyMember,
  removeBoardItem,
  removeDemoData,
  removeModuleFeed,
  saveModuleFeed,
  setFamilyModuleEnabled,
  setModuleVisibility,
  syncModuleFeed,
  toggleBoardItem,
  touchMemberLastSeen,
  updateFamilyMember,
  updateFamilyMemberAvatar,
  type NewBoardItemInput,
  type NewEventInput,
  type NewFamilyMemberInput,
  type UpdateFamilyMemberInput,
} from "../db/queries";
import {
  createCustomService,
  deleteCustomService,
  setCustomServiceFeedUrl,
  setCustomServicePersonIds,
  syncCustomServiceFeed,
  type NewCustomServiceInput,
} from "../db/custom-services-queries";
import {
  createModuleRequest,
  listModuleRequestsForFamily,
  type NewModuleRequestInput,
} from "../db/module-requests-queries";
import { discoverCalendarFeeds } from "../src/core/calendar-discovery";

export async function createEventAction(input: NewEventInput) {
  const event = await createEvent(input);
  revalidatePath("/");
  return event;
}

export async function createFamilyMemberAction(input: NewFamilyMemberInput) {
  const member = await createFamilyMember(input);
  revalidatePath("/");
  return member;
}

export async function updateFamilyMemberAvatarAction(memberId: string, avatarEmoji: string) {
  const member = await updateFamilyMemberAvatar(memberId, avatarEmoji);
  revalidatePath("/");
  return member;
}

export async function updateFamilyMemberAction(
  memberId: string,
  input: UpdateFamilyMemberInput
) {
  const member = await updateFamilyMember(memberId, input);
  revalidatePath("/");
  return member;
}

export async function createBoardItemAction(input: NewBoardItemInput) {
  const item = await createBoardItem(input);
  revalidatePath("/");
  return item;
}

export async function toggleBoardItemAction(id: string) {
  const item = await toggleBoardItem(id);
  revalidatePath("/");
  return item;
}

export async function removeBoardItemAction(id: string) {
  await removeBoardItem(id);
  revalidatePath("/");
}

export async function setFamilyModuleEnabledAction(
  familyId: string,
  moduleKey: string,
  enabled: boolean
) {
  await setFamilyModuleEnabled(familyId, moduleKey, enabled);
  revalidatePath("/");
}

export async function saveModuleFeedAction(
  familyId: string,
  moduleKey: string,
  feed: { id?: string; label: string; url: string; personIds?: string[] }
) {
  const saved = await saveModuleFeed(familyId, moduleKey, feed);
  revalidatePath("/");
  return saved;
}

export async function setModuleVisibilityAction(
  familyId: string,
  moduleKey: string,
  memberIds: string[]
) {
  await setModuleVisibility(familyId, moduleKey, memberIds);
  revalidatePath("/");
}

export async function removeModuleFeedAction(
  familyId: string,
  moduleKey: string,
  feedId: string
) {
  await removeModuleFeed(familyId, moduleKey, feedId);
  revalidatePath("/");
}

export async function syncModuleFeedAction(familyId: string, moduleKey: string, feedId: string) {
  const result = await syncModuleFeed(familyId, moduleKey, feedId);
  revalidatePath("/");
  return result;
}

export async function createCustomServiceAction(input: NewCustomServiceInput) {
  const service = await createCustomService(input);
  revalidatePath("/");
  return service;
}

export async function deleteCustomServiceAction(id: string, familyId: string) {
  await deleteCustomService(id, familyId);
  revalidatePath("/");
}

export async function setCustomServiceFeedUrlAction(
  id: string,
  familyId: string,
  feedUrl: string
) {
  await setCustomServiceFeedUrl(id, familyId, feedUrl);
  revalidatePath("/");
}

export async function syncCustomServiceFeedAction(familyId: string, serviceId: string) {
  const result = await syncCustomServiceFeed(familyId, serviceId);
  revalidatePath("/");
  return result;
}

export async function discoverCalendarFeedsAction(pageUrl: string) {
  return discoverCalendarFeeds(pageUrl);
}

export async function setCustomServicePersonIdsAction(
  id: string,
  familyId: string,
  personIds: string[]
) {
  await setCustomServicePersonIds(id, familyId, personIds);
  revalidatePath("/");
}

export async function touchMemberLastSeenAction(memberId: string) {
  await touchMemberLastSeen(memberId);
}

export async function removeDemoDataAction(familyId: string) {
  const result = await removeDemoData(familyId);
  revalidatePath("/");
  return result;
}

export async function requestModuleAction(input: NewModuleRequestInput) {
  const request = await createModuleRequest(input);
  revalidatePath("/");
  return request;
}

export async function listModuleRequestsAction(familyId: string) {
  return listModuleRequestsForFamily(familyId);
}
