"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "../lib/auth/session";
import {
  createBoardItem,
  createEvent,
  createFamilyMember,
  deleteEvent,
  hideEvent,
  removeBoardItem,
  removeDemoData,
  removeModuleFeed,
  saveModuleFeed,
  setFamilyModuleEnabled,
  setModuleVisibility,
  snoozeEvent,
  syncModuleFeed,
  toggleBoardItem,
  touchMemberLastSeen,
  updateBoardItem,
  updateEvent,
  updateFamilyMember,
  updateFamilyMemberAvatar,
  type NewBoardItemInput,
  type NewEventInput,
  type NewFamilyMemberInput,
  type UpdateBoardItemInput,
  type UpdateEventInput,
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
  const session = await requireSession();
  const event = await createEvent({ ...input, familyId: session.familyId });
  revalidatePath("/");
  return event;
}

export async function updateEventAction(id: string, input: UpdateEventInput) {
  const session = await requireSession();
  const event = await updateEvent(id, session.familyId, input);
  revalidatePath("/");
  return event;
}

export async function deleteEventAction(id: string) {
  const session = await requireSession();
  await deleteEvent(id, session.familyId);
  revalidatePath("/");
}

export async function hideEventAction(id: string) {
  const session = await requireSession();
  const event = await hideEvent(id, session.familyId);
  revalidatePath("/");
  return event;
}

export async function snoozeEventAction(id: string, snoozeUntil: string) {
  const session = await requireSession();
  const event = await snoozeEvent(id, session.familyId, snoozeUntil);
  revalidatePath("/");
  return event;
}

export async function createFamilyMemberAction(input: NewFamilyMemberInput) {
  const session = await requireSession();
  const member = await createFamilyMember({ ...input, familyId: session.familyId });
  revalidatePath("/");
  return member;
}

export async function updateFamilyMemberAvatarAction(memberId: string, avatarEmoji: string) {
  const session = await requireSession();
  const member = await updateFamilyMemberAvatar(memberId, session.familyId, avatarEmoji);
  revalidatePath("/");
  return member;
}

export async function updateFamilyMemberAction(
  memberId: string,
  input: UpdateFamilyMemberInput
) {
  const session = await requireSession();
  const member = await updateFamilyMember(memberId, session.familyId, input);
  revalidatePath("/");
  return member;
}

export async function createBoardItemAction(input: NewBoardItemInput) {
  const session = await requireSession();
  const item = await createBoardItem({ ...input, familyId: session.familyId });
  revalidatePath("/");
  return item;
}

export async function updateBoardItemAction(id: string, input: UpdateBoardItemInput) {
  const session = await requireSession();
  const item = await updateBoardItem(id, session.familyId, input);
  revalidatePath("/");
  return item;
}

export async function toggleBoardItemAction(id: string) {
  const session = await requireSession();
  const item = await toggleBoardItem(id, session.familyId);
  revalidatePath("/");
  return item;
}

export async function removeBoardItemAction(id: string) {
  const session = await requireSession();
  await removeBoardItem(id, session.familyId);
  revalidatePath("/");
}

export async function setFamilyModuleEnabledAction(
  familyId: string,
  moduleKey: string,
  enabled: boolean
) {
  const session = await requireSession();
  await setFamilyModuleEnabled(session.familyId, moduleKey, enabled);
  revalidatePath("/");
}

export async function saveModuleFeedAction(
  familyId: string,
  moduleKey: string,
  feed: { id?: string; label: string; url: string; personIds?: string[] }
) {
  const session = await requireSession();
  const saved = await saveModuleFeed(session.familyId, moduleKey, feed);
  revalidatePath("/");
  return saved;
}

export async function setModuleVisibilityAction(
  familyId: string,
  moduleKey: string,
  memberIds: string[]
) {
  const session = await requireSession();
  await setModuleVisibility(session.familyId, moduleKey, memberIds);
  revalidatePath("/");
}

export async function removeModuleFeedAction(
  familyId: string,
  moduleKey: string,
  feedId: string
) {
  const session = await requireSession();
  await removeModuleFeed(session.familyId, moduleKey, feedId);
  revalidatePath("/");
}

export async function syncModuleFeedAction(familyId: string, moduleKey: string, feedId: string) {
  const session = await requireSession();
  const result = await syncModuleFeed(session.familyId, moduleKey, feedId);
  revalidatePath("/");
  return result;
}

export async function createCustomServiceAction(input: NewCustomServiceInput) {
  const session = await requireSession();
  const service = await createCustomService({ ...input, familyId: session.familyId });
  revalidatePath("/");
  return service;
}

export async function deleteCustomServiceAction(id: string) {
  const session = await requireSession();
  await deleteCustomService(id, session.familyId);
  revalidatePath("/");
}

export async function setCustomServiceFeedUrlAction(
  id: string,
  familyId: string,
  feedUrl: string
) {
  const session = await requireSession();
  await setCustomServiceFeedUrl(id, session.familyId, feedUrl);
  revalidatePath("/");
}

export async function syncCustomServiceFeedAction(familyId: string, serviceId: string) {
  const session = await requireSession();
  const result = await syncCustomServiceFeed(session.familyId, serviceId);
  revalidatePath("/");
  return result;
}

export async function discoverCalendarFeedsAction(pageUrl: string) {
  await requireSession();
  return discoverCalendarFeeds(pageUrl);
}

const MAX_REMOTE_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Downloads a PDF from a public link server-side (so the browser never has
 * to make a cross-origin request to some school/club's website) and hands
 * the raw bytes back to the client as base64, where they're parsed with the
 * same pdfjs-dist logic used for locally-uploaded PDFs.
 */
export async function importPdfFromUrlAction(url: string): Promise<string> {
  await requireSession();

  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Please enter a valid http(s) link to a PDF.");
  }

  const res = await fetch(trimmed, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Couldn't download that PDF (server said ${res.status}).`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.byteLength > MAX_REMOTE_PDF_BYTES) {
    throw new Error("That PDF is too large to import (max 20MB).");
  }

  const contentType = res.headers.get("content-type") ?? "";
  const looksLikePdf =
    contentType.toLowerCase().includes("pdf") || buffer.subarray(0, 5).toString("latin1") === "%PDF-";
  if (!looksLikePdf) {
    throw new Error("That link doesn't look like a PDF file.");
  }

  return buffer.toString("base64");
}

export async function setCustomServicePersonIdsAction(
  id: string,
  familyId: string,
  personIds: string[]
) {
  const session = await requireSession();
  await setCustomServicePersonIds(id, session.familyId, personIds);
  revalidatePath("/");
}

export async function touchMemberLastSeenAction(memberId: string) {
  const session = await requireSession();
  await touchMemberLastSeen(memberId, session.familyId);
}

export async function removeDemoDataAction() {
  const session = await requireSession();
  const result = await removeDemoData(session.familyId);
  revalidatePath("/");
  return result;
}

export async function requestModuleAction(input: NewModuleRequestInput) {
  const session = await requireSession();
  const request = await createModuleRequest({ ...input, familyId: session.familyId });
  revalidatePath("/");
  return request;
}

export async function listModuleRequestsAction() {
  const session = await requireSession();
  return listModuleRequestsForFamily(session.familyId);
}
