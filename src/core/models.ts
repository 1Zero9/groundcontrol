export type Family = {
  id: string;
  name: string;
  timezone: string;
};

export type FamilyMember = {
  id: string;
  familyId?: string;
  name: string;
  shortName?: string;
  /** Personal nickname the member sets for themselves on their own Profile screen. */
  nickname?: string;
  colour: string;
  avatar?: string;
  avatarEmoji?: string;
  role: "adult" | "teen" | "child" | "pet";
  title?: string;
  /** True if this profile already has its own login (see /invite connect flow). */
  hasAccount?: boolean;
  /** ISO timestamp of the last time this profile was made active. */
  lastSeenAt?: string;
};

// Core categories always available (from the "planner" module). Modules can
// introduce further categories (e.g. "sports.match", "school.trip") — see
// src/core/module-registry.ts. Kept as `string` at the type level so the UI
// doesn't need to know about every module's categories ahead of time.
export type EventCategory =
  | "sports"
  | "school"
  | "family"
  | "appointment"
  | "college"
  | "holiday"
  | "chores"
  | "medicine"
  | "shopping"
  | "work"
  | "general"
  | (string & {});

export type Event = {
  id: string;
  familyId?: string;
  /** Which module (sports/school/life/...) produced this event, if any. */
  moduleKey?: string;
  /** Which family-defined custom service (see Modules > Your services) this is tagged to, if any. */
  customServiceId?: string;
  title: string;
  description?: string;
  start: string;
  end?: string;
  allDay?: boolean;
  personIds: string[];
  category: EventCategory;
  location?: string;
  icon?: string;
  accentColor?: string;
  source?: string;
  sourceId?: string;
  status?: "active" | "cancelled" | "completed";
  /** ISO timestamp if this event has been swiped "hidden" from calendar views. */
  hiddenAt?: string;
  /** ISO timestamp until which this event is swiped "snoozed" from calendar views. */
  snoozedUntil?: string;
  /** Module-specific structured payload (e.g. sports opponent, school term). */
  details?: Record<string, unknown>;
  /** True for starter/onboarding content auto-created for a new family. */
  isDemo?: boolean;
};

export type BoardItem = {
  id: string;
  familyId?: string;
  moduleKey?: string;
  customServiceId?: string;
  text: string;
  subtitle?: string;
  type?: "note" | "task" | "reminder" | "countdown";
  personIds?: string[];
  createdAt: string;
  expiresAt?: string;
  countdownDate?: string;
  progressCurrent?: number;
  progressTotal?: number;
  pinned?: boolean;
  completed?: boolean;
  badge?: string;
  color?: string;
  /** True for starter/onboarding content auto-created for a new family. */
  isDemo?: boolean;
};

/**
 * A single calendar feed (iCal/webcal) attached to a module. Modules support
 * more than one — e.g. a Sports module can have one feed per kid/team.
 */
export type ModuleFeed = {
  id: string;
  /** User-facing label, e.g. "Emma — Football" or "Jack — Swimming". */
  label: string;
  url: string;
  /** ISO timestamp of the last successful sync of this specific feed, if any. */
  lastSyncedAt?: string;
  /** Family members events synced from this feed should be tagged to (empty/undefined = everyone). */
  personIds?: string[];
};

export type GroundControlModule = {
  id: string;
  /** Stable registry key, e.g. "sports" | "school" | "life". */
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  /** Core modules are always on and can't be disabled per family. */
  isCore: boolean;
  /** Admin-created module (not in the code registry) — only visible once assigned to this family. */
  isCustom?: boolean;
  status?: "installed" | "available" | "coming-soon";
  icon?: string;
  /** Display accent for custom modules (registry modules use their category colours instead). */
  colour?: string;
  /** Calendar feeds (iCal/webcal) this module syncs events from — can be more than one. */
  feeds: ModuleFeed[];
  /** Family members who can see this module's data (empty/undefined = everyone). Adults always see everything. */
  visibleToMemberIds?: string[];
};
