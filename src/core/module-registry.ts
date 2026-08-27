import { z } from "zod";

/**
 * MODULE REGISTRY
 * ---------------
 * This is the plug-in surface for Ground Control. The core app (events +
 * board) doesn't know anything about sports fixtures or school terms — each
 * module below just contributes:
 *
 *  - the event `category` values it owns
 *  - a zod schema for the structured `details` payload stored alongside an
 *    event/board item (validated at the API boundary, stored as jsonb)
 *  - display metadata (icon, colour) used by generic UI (Add sheet, badges)
 *
 * `key` must match a row in the `modules` table (db/schema.ts). Adding a new
 * module = add an entry here + a row in the DB, no core schema changes.
 */

export type ModuleKey = "planner" | "board" | "sports" | "school" | "life";

export interface ModuleCategory {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export interface ModuleDefinition<
  Details extends z.ZodTypeAny = z.ZodTypeAny,
> {
  key: ModuleKey;
  name: string;
  description: string;
  icon: string;
  /** Core modules are always enabled and can't be turned off per family. */
  isCore: boolean;
  categories: ModuleCategory[];
  detailsSchema: Details;
}

// ---------------------------------------------------------------------------
// Core modules — always on
// ---------------------------------------------------------------------------

const plannerModule: ModuleDefinition = {
  key: "planner",
  name: "Planner",
  description: "Shared events and weekly plans",
  icon: "calendar-days",
  isCore: true,
  categories: [
    { value: "family", label: "Family", icon: "💖", color: "#22C1A2" },
    { value: "appointment", label: "Appointment", icon: "📅", color: "#FF5CA8" },
    { value: "holiday", label: "Holiday", icon: "🌴", color: "#4D96FF" },
    { value: "work", label: "Work", icon: "💼", color: "#22C1A2" },
    { value: "general", label: "General", icon: "✨", color: "#6C4DFF" },
  ],
  detailsSchema: z.object({}).passthrough(),
};

const boardModule: ModuleDefinition = {
  key: "board",
  name: "Board",
  description: "Quick notes, reminders and countdowns",
  icon: "pin",
  isCore: true,
  categories: [],
  detailsSchema: z.object({}).passthrough(),
};

// ---------------------------------------------------------------------------
// Sports module
// ---------------------------------------------------------------------------

export const sportsDetailsSchema = z.object({
  team: z.string().optional(),
  opponent: z.string().optional(),
  competition: z.string().optional(),
  homeAway: z.enum(["home", "away"]).optional(),
  result: z.string().optional(),
  kit: z.string().optional(),
});
export type SportsDetails = z.infer<typeof sportsDetailsSchema>;

const sportsModule: ModuleDefinition<typeof sportsDetailsSchema> = {
  key: "sports",
  name: "Sports",
  description: "Fixtures, training and team schedules",
  icon: "trophy",
  isCore: false,
  categories: [
    { value: "sports.training", label: "Training", icon: "🏃", color: "#6C4DFF" },
    { value: "sports.match", label: "Match", icon: "⚽", color: "#6C4DFF" },
    { value: "sports.tournament", label: "Tournament", icon: "🏆", color: "#FFB347" },
  ],
  detailsSchema: sportsDetailsSchema,
};

// ---------------------------------------------------------------------------
// School module
// ---------------------------------------------------------------------------

export const schoolDetailsSchema = z.object({
  subject: z.string().optional(),
  teacher: z.string().optional(),
  term: z.string().optional(),
  requiresForm: z.boolean().optional(),
  requiresPayment: z.boolean().optional(),
  amount: z.number().optional(),
});
export type SchoolDetails = z.infer<typeof schoolDetailsSchema>;

const schoolModule: ModuleDefinition<typeof schoolDetailsSchema> = {
  key: "school",
  name: "School",
  description: "Term dates, forms and activities",
  icon: "graduation-cap",
  isCore: false,
  categories: [
    { value: "school.lesson", label: "Lesson", icon: "📚", color: "#FFB347" },
    { value: "school.trip", label: "School trip", icon: "🚌", color: "#FFB347" },
    { value: "school.event", label: "School event", icon: "🏫", color: "#FFB347" },
    { value: "school.deadline", label: "Deadline", icon: "⏰", color: "#FF5CA8" },
  ],
  detailsSchema: schoolDetailsSchema,
};

// ---------------------------------------------------------------------------
// Life module (medical, chores, milestones, shopping, ...)
// ---------------------------------------------------------------------------

export const lifeDetailsSchema = z.object({
  milestoneType: z.string().optional(),
  provider: z.string().optional(),
  dosage: z.string().optional(),
  courseLength: z.number().optional(),
  courseDay: z.number().optional(),
});
export type LifeDetails = z.infer<typeof lifeDetailsSchema>;

const lifeModule: ModuleDefinition<typeof lifeDetailsSchema> = {
  key: "life",
  name: "Life",
  description: "Health, chores and everyday household stuff",
  icon: "heart-pulse",
  isCore: false,
  categories: [
    { value: "life.medicine", label: "Medicine", icon: "💊", color: "#FF5CA8" },
    { value: "life.chores", label: "Chores", icon: "🧹", color: "#22C1A2" },
    { value: "life.shopping", label: "Shopping", icon: "🛒", color: "#4D96FF" },
    { value: "life.milestone", label: "Milestone", icon: "🎉", color: "#FFB347" },
    { value: "life.pet", label: "Pet care", icon: "🐾", color: "#FFB347" },
  ],
  detailsSchema: lifeDetailsSchema,
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const moduleRegistry: ModuleDefinition[] = [
  plannerModule,
  boardModule,
  sportsModule,
  schoolModule,
  lifeModule,
];

export function getModule(key: ModuleKey): ModuleDefinition | undefined {
  return moduleRegistry.find((m) => m.key === key);
}

export function getModuleByCategory(
  category: string
): ModuleDefinition | undefined {
  return moduleRegistry.find((m) =>
    m.categories.some((c) => c.value === category)
  );
}

export function getAllCategories(): ModuleCategory[] {
  return moduleRegistry.flatMap((m) => m.categories);
}
