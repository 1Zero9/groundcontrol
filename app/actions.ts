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
