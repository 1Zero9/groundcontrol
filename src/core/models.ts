export type FamilyMember = {
  id: string;
  name: string;
  shortName?: string;
  colour: string;
  avatar?: string;
  avatarEmoji?: string;
  role: "adult" | "teen" | "child" | "pet";
  title?: string;
};

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
  | "general";

export type Event = {
  id: string;
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
};

export type BoardItem = {
  id: string;
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
