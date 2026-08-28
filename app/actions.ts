"use server";

import { revalidatePath } from "next/cache";
import {
  createBoardItem,
  createEvent,
  removeBoardItem,
  setFamilyModuleEnabled,
  setModuleFeedUrl,
  syncModuleFeed,
  toggleBoardItem,
  type NewBoardItemInput,
  type NewEventInput,
} from "../db/queries";
import {
  createCustomService,
  deleteCustomService,
  setCustomServiceFeedUrl,
  syncCustomServiceFeed,
  type NewCustomServiceInput,
} from "../db/custom-services-queries";
import { discoverCalendarFeeds } from "../src/core/calendar-discovery";

export async function createEventAction(input: NewEventInput) {
  const event = await createEvent(input);
  revalidatePath("/");
  return event;
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

export async function saveModuleFeedUrlAction(
  familyId: string,
  moduleKey: string,
  feedUrl: string
) {
  await setModuleFeedUrl(familyId, moduleKey, feedUrl);
  revalidatePath("/");
}

export async function syncModuleFeedAction(familyId: string, moduleKey: string) {
  const result = await syncModuleFeed(familyId, moduleKey);
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
