"use server";

import { revalidatePath } from "next/cache";
import {
  createBoardItem,
  createEvent,
  removeBoardItem,
  setFamilyModuleEnabled,
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
