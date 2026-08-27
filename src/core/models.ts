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
  colour: string;
  avatar?: string;
  avatarEmoji?: string;
  role: "adult" | "teen" | "child" | "pet";
  title?: string;
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
  /** Module-specific structured payload (e.g. sports opponent, school term). */
  details?: Record<string, unknown>;
};

export type BoardItem = {
  id: string;
  familyId?: string;
  moduleKey?: string;
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
};

export type GroundControlModule = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  status?: "installed" | "available" | "coming-soon";
  icon?: string;
};
