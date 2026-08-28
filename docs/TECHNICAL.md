# Ground Control — Technical Documentation

A shared family "mission control" app: a calendar (Planner), a sticky-note
board (Board), and optional plug-in modules (Sports, School, Life) for
household-specific event types. Each household is a `family` with its own
login, members, events, notes, and enabled modules.

---

## 1. Tech stack

| Layer      | Choice |
|------------|--------|
| Framework  | Next.js 16 (App Router, Turbopack, React Server Components + Server Actions) |
| UI         | React 19, hand-written CSS (`app/globals.css`) — no CSS framework, no component library |
| Icons      | `lucide-react` |
| Validation | `zod` |
| Database   | PostgreSQL (Prisma Postgres / Neon-compatible), accessed via `pg` |
| ORM        | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) |
| Auth       | Hand-rolled — no external auth library (see [§5](#5-authentication)) |
| Hosting    | Vercel |
| Language   | TypeScript throughout |

No Tailwind is actually used despite being a devDependency (leftover from the
starter template) — all styling is plain CSS in `app/globals.css`.

---

## 2. Project structure

```
app/
  page.tsx                 Home route — session-gated, loads family data (Server Component)
  layout.tsx                Root layout, fonts, viewport
  manifest.ts                PWA manifest
  actions.ts                 Server Actions for events/board items/modules
  login/page.tsx             Login screen
  signup/page.tsx            Signup screen
  admin/
    page.tsx                 /admin console — operator-only, session+role-gated (Server Component)
    actions.ts                Admin Server Actions (connector config only — see §9)
  components/
    ground-control-app.tsx   Main client shell: tabs, display modes, state, optimistic updates
    today-view.tsx           "Today" tab
    week-view.tsx             "My week" tab
    remember-board-view.tsx  "Remember" (sticky notes / tasks) tab
    profile-view.tsx          "Profile" tab — switch member, logout, manage modules
    modules-view.tsx          Module marketplace (enable/disable modules, configure connectors)
    admin-view.tsx             /admin console UI (family list + per-family connector config)
    kitchen-display-view.tsx Kitchen wall-display mode (tablet/TV layout)
    add-modal.tsx              "Add" bottom sheet (event / task / note / reminder)
    cosmic-illustrations.tsx  Decorative SVG illustrations (Saturn, starfield, pushpin, badges)
  globals.css                 All application styling (theme tokens, per-screen sections)

db/
  schema.ts                   Drizzle table definitions + relations
  index.ts                     DB client (pg Pool via drizzle-orm/node-postgres)
  queries.ts                   Core data-access layer (events, board items, modules, connector sync)
  auth-queries.ts              Auth-specific queries (getUserByEmail, getUserById, createFamilyWithOwner)
  admin-queries.ts              Admin-only queries — families/modules/config, NEVER events/board (see §9)
  seed.ts                       Seeds module registry + a demo family/login for local dev
  promote-admin.ts               One-off script to grant/revoke /admin access (see §9)

lib/
  auth/
    password.ts                scrypt password hashing (Node's built-in crypto)
    session.ts                 Signed HMAC session cookie helpers
    actions.ts                  signupAction / loginAction / logoutAction (Server Actions)
    admin.ts                    requireAdmin() guard for the /admin console

src/
  core/
    models.ts                   Shared TS types (Family, FamilyMember, Event, BoardItem, GroundControlModule)
    module-registry.ts         The plug-in registry — source of truth for modules' categories/icons/schemas
    modules.ts                  Thin derived list from the registry (legacy/unused display helper)
    connectors.ts                Real iCal/webcal feed parser (`parseIcalFeed`) used by Sports/School sync
  data/
    mock-data.ts                 Original static mock data (still used to seed the demo family)

drizzle/                        Generated SQL migrations + snapshots (drizzle-kit generate)
```

---

## 3. Data model

Everything is scoped under a `family` (household). See `db/schema.ts` for the
full Drizzle definitions; summary:

- **`families`** — one row per household (`name`, `timezone`).
- **`users`** — login accounts. **One login per household**, not per family
  member. Has `familyId`, `email` (unique), `passwordHash`, `isAdmin`
  (operator/support flag, default `false` — see [§9](#9-admin-console--data-privacy-guarantee)).
- **`family_members`** — the people/pets shown in the app (adult/teen/child/pet
  role, colour, avatar, name). `userId` optionally links a member profile to
  the household's login account (marks "this member IS the account holder").
- **`modules`** — the plug-in registry mirrored in the DB: `key` (matches
  `src/core/module-registry.ts`), `name`, `description`, `icon`, `isCore`.
- **`family_modules`** — per-family enable/disable state + a `config` jsonb
  column for per-module settings — currently used to store a connector's
  `{ feedUrl, lastSyncedAt }` (see [§9](#9-admin-console--data-privacy-guarantee)).
  Unique on `(familyId, moduleId)`.
- **`events`** — generic calendar events. Core fields (title, start/end,
  personIds, category, location, icon, colour) plus a `details` jsonb column
  modules can use for structured extra data (e.g. sports opponent, school
  term). `moduleId` records which module created it (nullable = manual/core).
- **`board_items`** — sticky notes / tasks / reminders / countdowns. Same
  generic-core + module `details` pattern as events.

### The module plug-in system

`src/core/module-registry.ts` is the **code-level source of truth** for what
a module contributes:
- which `EventCategory` values it owns (e.g. `sports.match`, `school.trip`)
- a zod schema for its `details` jsonb payload
- display metadata (icon, colour)
- `isCore` — core modules (`planner`, `board`) are always enabled and can't
  be turned off per family

Adding a new module = add an entry to `moduleRegistry` + let `db:seed` (or a
migration) upsert a matching row into the `modules` table. No core schema
changes needed.

Per-family enable/disable state lives in `family_modules` and is read/written
via `db/queries.ts`'s `getFamilyModules()` / `setFamilyModuleEnabled()` —
see [Phase 3](#7-module-marketplace).

---

## 4. Application shell & rendering model

- `app/page.tsx` is an **async Server Component**: checks the session, loads
  `getFamilyBundle()` (members/events/board items) and `getFamilyModules()`
  in parallel, then renders the client shell (`GroundControlApp`) with that
  data as props (SSR — no client-side data fetching/loading spinners on first
  paint).
- `GroundControlApp` (`"use client"`) owns all interactive state: active tab,
  display mode (mobile / kitchen / full-screen responsive), dark mode,
  current selected family member, and local copies of events/board
  items/modules (seeded from server props, then updated optimistically).
- Tabs (`today` / `week` / `remember` / `profile` / `modules`) are plain
  conditionally-rendered React state — **not routes**. Only one tab's
  component is mounted at a time.
- **Mutations use the optimistic-update + Server Action pattern**:
  1. Update local React state immediately (instant UI feedback).
  2. Call the corresponding Server Action in `app/actions.ts`.
  3. On success, reconcile local state with the server's returned row
     (picks up the real DB-generated id, timestamps, etc).
  4. On error, roll back the local state change and log the error.
- Server Actions call `revalidatePath("/")` after every mutation so a full
  page reload always reflects the latest DB state too.

---

## 5. Authentication

Deliberately built with **zero external auth dependencies** — no NextAuth,
no `bcrypt`/`jose`, just Node's built-in `crypto`. See `lib/auth/`.

- **Model**: one login (`users` row) per household, not per family member.
  Signing up creates a `family` + `user` + a first adult `family_member`
  (linked via `family_members.userId`) + enables all `isCore` modules.
- **Passwords** (`lib/auth/password.ts`): `scrypt`-derived, stored as
  `"<salt>:<hash>"` hex strings. `verifyPassword` uses `timingSafeEqual` for
  constant-time comparison.
- **Sessions** (`lib/auth/session.ts`): a JSON payload
  (`{ userId, familyId, exp }`) is base64url-encoded and HMAC-SHA256-signed
  with a server-only `SESSION_SECRET`, stored as an `httpOnly`, `secure`
  (in production), `sameSite=lax` cookie named `gc_session`, 30-day expiry.
  `getSession()` verifies the signature + expiry on every request.
- **Server Actions** (`lib/auth/actions.ts`): `signupAction`, `loginAction`,
  `logoutAction`. Inputs validated with `zod`; failures redirect back to the
  form with `?error=<message>` (read and displayed by `app/login/page.tsx` /
  `app/signup/page.tsx`).
- **Route protection**: `app/page.tsx` calls `getSession()` and redirects to
  `/login` if there's no valid session. `/login` and `/signup` redirect to
  `/` if a session already exists.
- **Required env var**: `SESSION_SECRET` (64-char hex recommended — generate
  with `openssl rand -hex 32`). Must be set in `.env.local` for local dev and
  in Vercel's Production/Preview/Development environment variables.

⚠️ Note: this is a lightweight, from-scratch auth system suitable for a
small personal/family app. It has no rate limiting, no email verification,
no password reset flow, and no CSRF-token-based protection beyond what
Next.js Server Actions provide natively.

---

## 6. Environment & local development

Required environment variables (see `.env.local`, gitignored):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` / `POSTGRES_URL` / `PRISMA_DATABASE_URL` | Postgres connection strings (Vercel/Prisma Postgres provisioning) |
| `SESSION_SECRET` | HMAC signing key for session cookies |

```bash
npm install
npx vercel env pull .env.local --yes   # pull env vars from the linked Vercel project

npm run db:generate    # generate a new SQL migration from schema.ts changes
npm run db:push        # push schema directly to the DB (dev-friendly, no migration file needed)
npm run db:seed        # seed the module registry + a demo family + demo login
npm run db:studio      # open Drizzle Studio to browse the DB

npm run dev             # start Next.js dev server (Turbopack)
npm run build            # production build
npm run start             # run the production build locally
npm run lint               # ESLint
npx tsc --noEmit           # typecheck only
```

Demo login seeded by `npm run db:seed` (override via `SEED_DEMO_EMAIL` /
`SEED_DEMO_PASSWORD` env vars):
```
email:    dad@example.com
password: groundcontrol
```

Seeding is idempotent-ish: `SEED_SKIP_DEMO_FAMILY=1 npm run db:seed` seeds
only the module registry (useful against a real production DB where you
don't want a fake demo household).

---

## 7. Feature build log (by phase)

The app was built in phases; each is a discrete, shippable slice:

1. **Wire UI to the database** — replaced static mock data
   (`src/data/mock-data.ts`) with real Postgres reads/writes via
   `db/queries.ts` + `app/actions.ts`, with optimistic UI updates.
2. **Auth & family scoping** — the from-scratch login system described in
   [§5](#5-authentication); every request is now scoped to a real
   `familyId` from the session instead of "the oldest seeded family."
3. **Module marketplace** — a Profile → Modules screen where a household can
   toggle optional modules (Sports/School/Life) on/off. Backed by
   `getFamilyModules()` (merges the code registry with `family_modules` DB
   state) and `setFamilyModuleEnabled()` (upsert), exposed via the
   `setFamilyModuleEnabledAction` Server Action. Core modules
   (Planner/Board) are always on and shown locked in the UI.
4. **Connectors** — real iCal/webcal calendar feed sync for Sports/School
   modules. `src/core/connectors.ts`'s `parseIcalFeed()` (using `node-ical`)
   fetches and parses a household's feed URL (ClubZap, DDSL, school
   calendar exports, or any other iCal/webcal link); `syncModuleFeed()` in
   `db/queries.ts` upserts events keyed by `(familyId, source=moduleKey,
   sourceId=iCal UID)` so re-syncing updates rather than duplicates. Feed
   URL + last-synced-at are stored in `family_modules.config`. Exposed in
   the Modules screen (`FeedSyncRow` in `modules-view.tsx`) and mirrored in
   the admin console (§9) so an operator can configure it on a family's
   behalf.
5. **Admin console** — a `/admin` route + `isAdmin` flag so an operator can
   configure connectors for any family without seeing that family's
   personal data. See [§9](#9-admin-console--data-privacy-guarantee) for
   the full design and the privacy guarantee this depends on.

Planned but not yet built (roadmap):
6. Kitchen Display polish.
7. PWA / push notifications (a `manifest.ts` and service-worker
   registration already exist as a starting point; see `public/sw.js` and
   the `useEffect` in `ground-control-app.tsx`).
8. Production hardening (rate limiting, error monitoring, etc).
9. More connector types beyond calendar feeds (maps, food/meal planning,
   college schedules, etc.) — the module registry + `family_modules.config`
   jsonb pattern is designed to support this without further schema
   changes; each new connector type is just a new module registry entry +
   a parser function alongside `parseIcalFeed`.

---

## 8. Known gaps / things to be aware of

- `app/chatgpt-auth.ts` and the top of `README.md` are leftovers from the
  original Next.js/vinext starter template and are **not used** by the real
  auth system — safe to ignore or delete.
- `src/core/modules.ts` (the static `modules` array derived from the
  registry) is currently unused by any component; `db/queries.ts`'s
  `getFamilyModules()` is the real source of per-family module state.
- ESLint currently reports ~15 pre-existing issues (mostly `React` unused
  imports under the new JSX transform, and a couple of accessibility lint
  rules in `add-modal.tsx`/`week-view.tsx`). None are new/introduced by
  recent phases — check `npm run lint` output before assuming a change
  caused a regression.
- The `AddModal` component's category selector is currently generic
  (event/task/note/reminder) and does not yet read from
  `module-registry.ts`'s per-module categories — a natural follow-up once
  more modules are connector-backed.

---

## 9. Admin console & data-privacy guarantee

Ground Control is multi-tenant: every household is an isolated `family`. As
connectors (calendar feeds, and future integrations — maps, food, college
schedules, etc.) are added, someone needs to be able to configure them on a
family's behalf (pasting in a feed URL, troubleshooting a sync) without that
becoming a backdoor into other households' private data. `/admin` is built
so that's true **by construction**, not just by policy:

### Who can access it
- `users.isAdmin` (boolean, default `false`) is the only gate. It is **never**
  settable through signup, login, or any in-app UI — the only way to grant
  or revoke it is the `npm run admin:promote -- <email> [--revoke]` script
  (`db/promote-admin.ts`), run directly against the database by whoever
  operates the deployment.
- `lib/auth/admin.ts`'s `requireAdmin()` re-reads the `isAdmin` flag from the
  database on every request (never trusts a cached value in the session
  cookie), so revoking access takes effect on the very next request — not
  after a 30-day cookie expires.
- Non-admins hitting `/admin` are redirected to `/` (not shown a 403), so the
  route's existence isn't signalled to regular users.

### What the admin console can see and do
Everything under `/admin` (`app/admin/page.tsx`, `app/admin/actions.ts`,
`app/components/admin-view.tsx`, `db/admin-queries.ts`) is scoped to exactly
three things, for **any** family:
1. Family name, member **names** (for identification — "which household is
   this"), and the account owner's email.
2. Which modules (Sports/School/Life/...) are enabled or disabled.
3. A module's connector config: the feed URL, last-synced timestamp, and a
   button to trigger a sync (showing only a created/updated **count**, never
   the synced events' content).

### What it deliberately cannot see
`db/admin-queries.ts` only ever selects from `families`, `family_members`
(names only), `users` (email only), `modules`, and `family_modules`. It has
**no import of, and never queries, the `events` or `board_items` tables** —
a family's calendar entries, sticky notes, tasks, reminders, and countdowns
are structurally unreachable from any admin code path, not merely hidden by
the UI. `adminSyncModuleFeedAction` calls the same `syncModuleFeed()` used by
the household's own Modules screen, but only returns `{ createdCount,
updatedCount, lastSyncedAt }` to the client — never the actual event titles/
locations/times that were synced.

If a future connector type needs to expose more than on/off + a feed URL,
extend `family_modules.config` and `AdminFamilySummary`/`GroundControlModule`
the same way this was done for `feedUrl`/`lastSyncedAt` — but any change that
would let `db/admin-queries.ts` join to `events`/`board_items` (or return
their contents from an admin action) should be treated as a breaking change
to this guarantee and called out explicitly in a PR/commit message.
