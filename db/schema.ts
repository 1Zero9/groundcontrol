import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * CORE SCHEMA
 * -----------
 * Ground Control is multi-tenant per family. Everything hangs off `families`.
 * `modules` + `familyModules` are the plug-in system: the core app only knows
 * how to render generic Events and Board Items, and modules (sports, school,
 * life, ...) contribute categories + a typed `details` payload on top of that
 * generic shape. See src/core/module-registry.ts for the code-level module
 * definitions (icons, categories, zod schema for `details`) that pair with
 * the `modules.key` column here.
 */

export const memberRoleEnum = pgEnum("member_role", [
  "adult",
  "teen",
  "child",
  "pet",
]);

export const boardItemTypeEnum = pgEnum("board_item_type", [
  "note",
  "task",
  "reminder",
  "countdown",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "active",
  "cancelled",
  "completed",
]);

// ---------------------------------------------------------------------------
// Families & members
// ---------------------------------------------------------------------------

export const families = pgTable("families", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("Europe/Dublin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Users (login accounts, one per household, linked to a family)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  // scrypt-derived hash, format "salt:hash" (see lib/auth/password.ts).
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Admins (operator/support logins — completely separate from family users)
// ---------------------------------------------------------------------------

/**
 * Standalone operator identity for the /admin console. Deliberately has NO
 * relationship to `families`/`users` at all — a family login can never carry
 * admin rights, and an admin login can never act as a family. Created only
 * via `npm run admin:create` (see `db/create-admin.ts`), never via signup or
 * any in-app UI. See docs/TECHNICAL.md §9 "Admin console & data-privacy
 * guarantee".
 */
export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  // scrypt-derived hash, format "salt:hash" (see lib/auth/password.ts).
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const familyMembers = pgTable("family_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  shortName: text("short_name"),
  colour: text("colour").notNull(),
  avatarEmoji: text("avatar_emoji"),
  role: memberRoleEnum("role").notNull().default("child"),
  title: text("title"),
  // Marks which profile the logged-in account holder is. Nullable so
  // kids/pets can exist as profiles without their own login.
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Modules (the plug-in registry)
// ---------------------------------------------------------------------------

export const modules = pgTable("modules", {
  id: uuid("id").defaultRandom().primaryKey(),
  // Stable slug matching a key in src/core/module-registry.ts, e.g.
  // "planner" | "board" | "sports" | "school" | "life".
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  // Core modules (planner/board) can't be disabled per family.
  isCore: boolean("is_core").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const familyModules = pgTable(
  "family_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    familyId: uuid("family_id")
      .notNull()
      .references(() => families.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => modules.id, { onDelete: "cascade" }),
    enabled: boolean("enabled").notNull().default(true),
    // Per-family, per-module settings (e.g. sports: { club: "Belvedere FC" }).
    config: jsonb("config").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    familyModuleUnique: uniqueIndex("family_module_unique").on(
      t.familyId,
      t.moduleId
    ),
  })
);

// ---------------------------------------------------------------------------
// Events (generic core entity; modules attach structured `details`)
// ---------------------------------------------------------------------------

export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  // Which module produced this event, if any (null = plain core/manual event).
  moduleId: uuid("module_id").references(() => modules.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  description: text("description"),
  start: timestamp("start", { withTimezone: true }).notNull(),
  end: timestamp("end", { withTimezone: true }),
  allDay: boolean("all_day").notNull().default(false),
  // Free-form category text (e.g. "sports", "school", "family", "chores").
  // Modules define + validate the categories they own; core doesn't enforce
  // a fixed enum here so new modules can introduce new categories.
  category: text("category").notNull(),
  // Family members this event applies to (array of family_members.id).
  personIds: uuid("person_ids").array().notNull().default([]),
  location: text("location"),
  icon: text("icon"),
  accentColor: text("accent_color"),
  // Where this event came from: "manual" | connector name, e.g. "ClubZap".
  source: text("source"),
  sourceId: text("source_id"),
  status: eventStatusEnum("status").notNull().default("active"),
  // Module-specific structured payload, validated by the module's zod schema
  // at the application layer (e.g. sports: { opponent, competition, venue }).
  details: jsonb("details").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Board items (sticky notes / tasks / reminders / countdowns)
// ---------------------------------------------------------------------------

export const boardItems = pgTable("board_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  familyId: uuid("family_id")
    .notNull()
    .references(() => families.id, { onDelete: "cascade" }),
  moduleId: uuid("module_id").references(() => modules.id, {
    onDelete: "set null",
  }),
  text: text("text").notNull(),
  subtitle: text("subtitle"),
  type: boardItemTypeEnum("type").notNull().default("note"),
  personIds: uuid("person_ids").array().notNull().default([]),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  countdownDate: timestamp("countdown_date", { withTimezone: true }),
  progressCurrent: integer("progress_current"),
  progressTotal: integer("progress_total"),
  pinned: boolean("pinned").notNull().default(false),
  completed: boolean("completed").notNull().default(false),
  badge: text("badge"),
  color: text("color"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations (for Drizzle's relational query API)
// ---------------------------------------------------------------------------

export const familiesRelations = relations(families, ({ many }) => ({
  members: many(familyMembers),
  modules: many(familyModules),
  events: many(events),
  boardItems: many(boardItems),
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  family: one(families, {
    fields: [users.familyId],
    references: [families.id],
  }),
  memberProfiles: many(familyMembers),
}));

export const familyMembersRelations = relations(familyMembers, ({ one }) => ({
  family: one(families, {
    fields: [familyMembers.familyId],
    references: [families.id],
  }),
  user: one(users, {
    fields: [familyMembers.userId],
    references: [users.id],
  }),
}));

export const modulesRelations = relations(modules, ({ many }) => ({
  familyModules: many(familyModules),
}));

export const familyModulesRelations = relations(familyModules, ({ one }) => ({
  family: one(families, {
    fields: [familyModules.familyId],
    references: [families.id],
  }),
  module: one(modules, {
    fields: [familyModules.moduleId],
    references: [modules.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  family: one(families, {
    fields: [events.familyId],
    references: [families.id],
  }),
  module: one(modules, {
    fields: [events.moduleId],
    references: [modules.id],
  }),
}));

export const boardItemsRelations = relations(boardItems, ({ one }) => ({
  family: one(families, {
    fields: [boardItems.familyId],
    references: [families.id],
  }),
  module: one(modules, {
    fields: [boardItems.moduleId],
    references: [modules.id],
  }),
}));
