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
| Testing    | Vitest (unit tests for auth/rate-limit/date helpers — see `**/*.test.ts`) |
| CI         | GitHub Actions (`.github/workflows/ci.yml`) — lint, typecheck, test, build on every push/PR |
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
  actions.ts                 Server Actions for events/board items/modules/family members/module requests
  error.tsx, global-error.tsx  Route-level and root error boundaries (logs via lib/log-error.ts)
  login/page.tsx             Login screen (family) — includes "Forgot your password?" link
  signup/page.tsx            Signup screen (family)
  forgot-password/page.tsx    Request a password-reset email
  reset-password/page.tsx     Set a new password from a reset-email link
  invite/page.tsx            /invite — a family member claims their own login via a shared link (see §5)
  privacy/page.tsx, terms/page.tsx  Static legal pages linked from the auth screens
  admin/
    login/page.tsx           /admin/login — "Continue with Google" button, not a family login
    auth/google/route.ts     Starts Google OAuth (sets CSRF state cookie, redirects to Google)
    auth/google/callback/route.ts  Verifies Google identity + allowlist, sets admin session
    page.tsx                 /admin console — operator-only, gated by its own admin session (Server Component)
    actions.ts                Admin Server Actions (connector config, custom modules, module requests — see §9)
  components/
    ground-control-app.tsx   Main client shell: tabs, nav drawer, state, optimistic updates
    today-view.tsx           "Today" tab
    week-view.tsx             "My week" tab — events are editable/deletable
    remember-board-view.tsx  "Remember board" tab
    profile-view.tsx          "Profile" tab — mission stats, Family Admin/Kitchen Display/theme/Help/logout
    family-admin-view.tsx     "Family Admin" tab (adults only) — member list, edit/invite members, manage modules, remove demo data
    modules-view.tsx          Module marketplace (enable/disable modules, configure connectors, request a module)
    help-view.tsx              Basic in-app Help screen (icon-pack-illustrated guide to each screen)
    add-modal.tsx              "Add" bottom sheet (event / task / note / reminder) — plus photo OCR, PDF import, convert-to-event
    add-member-modal.tsx      Add **and edit** a family member (name/role/avatar/colour) — shared modal
    invite-link-modal.tsx     Generates and shares a "connect to the app" login link for a family member
    edit-avatar-modal.tsx     Change the current user's own avatar icon
    admin-view.tsx             /admin console UI (family list, per-family connector config, custom modules, module requests)
    kitchen-display-view.tsx Kitchen wall-display mode (tablet/TV layout)
    auth-shell.tsx              Shared cosmic-themed shell/card wrapper for login/signup/admin-login/invite
    password-field.tsx          Reusable show/hide password `<input>` used by all auth forms
    member-avatar.tsx           Renders a family member's avatar icon (or initial) consistently
    event-icon.tsx               Resolves a category → icon mapping for event/board item cards
    cosmic-illustrations.tsx  Decorative SVG illustrations (Saturn, starfield, pushpin, rocket, badges)
    site-footer.tsx              Shared footer (privacy/terms links) for the auth screens
  globals.css                 All application styling (theme tokens, per-screen sections)

db/
  schema.ts                   Drizzle table definitions + relations
  index.ts                     DB client (pg Pool via drizzle-orm/node-postgres)
  queries.ts                   Core data-access layer (events, board items, modules, connector sync, family members)
  auth-queries.ts              Auth-specific queries (getUserByEmail, getUserById, createFamilyWithOwner)
  admin-auth-queries.ts          Auth queries for the standalone `admins` table — Google-profile upsert (see §9)
  admin-queries.ts              Admin-only queries — families/modules/config/custom modules/module requests, NEVER events/board (see §9)
  custom-services-queries.ts    Family-defined ad-hoc "services" (e.g. a college schedule) with an optional feed
  module-requests-queries.ts    Family-side "request a module" create/list queries (paired with admin resolve queries above)
  baseline-migrations.ts        One-off script that marks pre-existing `db:push`-applied migrations as done (see §6)
  seed.ts                       Seeds module registry + a demo family/login for local dev

lib/
  rate-limit.ts                 Fixed-window rate limiter (Postgres-backed) for auth-sensitive Server Actions
  log-error.ts                   Shared server-side error logging hook used by error boundaries and actions
  email.ts                       Minimal email-sending helper used by the password-reset flow
  auth/
    password.ts                scrypt password hashing (Node's built-in crypto) — family logins only
    password-reset.ts            Signed password-reset token create/verify + the reset Server Action
    token.ts                    Generic signed-token helper shared by every signed-token use case below
    session.ts                 Family session — signed `gc_session` cookie helpers
    actions.ts                  signupAction / loginAction / logoutAction / member-invite actions (Server Actions) — rate-limited
    member-invite.ts             Stateless signed "connect to the app" invite token (create/verify, 3-day expiry)
    admin-session.ts             Admin session — separate signed `gc_admin_session` cookie (see §9)
    admin-actions.ts             adminLogoutAction (Server Action) — sign-in is the OAuth route above, not an action
    admin-allowlist.ts           Hardcoded list of emails allowed to ever hold admin access (see §9)
    google-oauth.ts              Minimal hand-rolled Google OAuth 2.0 client (no external library)
    admin.ts                    requireAdmin() guard for the /admin console
    *.test.ts                    Vitest unit tests for password/token helpers

src/
  core/
    models.ts                   Shared TS types (Family, FamilyMember, Event, BoardItem, GroundControlModule)
    module-registry.ts         The plug-in registry — source of truth for modules' categories/icons/schemas (planner, board, sports, school, life, bills)
    modules.ts                  Thin derived list from the registry (legacy/unused display helper)
    connectors.ts                Real iCal/webcal feed parser (`parseIcalFeed`) used by Sports/School sync
    calendar-discovery.ts        Best-effort scraping to suggest a calendar feed URL from a plain website link
    avatars.ts                   The illustrated avatar icon-pack options (`AVATAR_ICON_OPTIONS`) + path helper
    category-icons.ts            Event/board-item category → icon mapping
    date-utils.ts                Week-grid/date-formatting helpers shared by Today/Week views
    date-utils.test.ts            Vitest unit tests for the above
    pdf-extract.ts                Extracts candidate events (text + date/time) from an uploaded PDF for the Add sheet
    use-now.ts                    `useNow()` hook — hydration-safe "current time", refreshed on an interval
  data/
    mock-data.ts                 Original static mock data (still used to seed the demo family)

drizzle/                        SQL migration files + snapshots (drizzle-kit generate), applied via drizzle-kit migrate
public/
  icon_pack/                     Illustrated nav/category/avatar PNG icon set used throughout the UI
.github/
  workflows/ci.yml                CI: install, lint, typecheck, test, build on every push/PR
```

---

## 3. Data model

Everything is scoped under a `family` (household). See `db/schema.ts` for the
full Drizzle definitions; summary:

- **`families`** — one row per household (`name`, `timezone`).
- **`users`** — login accounts. **One login per household**, not per family
  member. Has `familyId`, `email` (unique), `passwordHash`. No admin/role
  concept lives here — a family login can never carry operator power (see
  [§9](#9-admin-console--data-privacy-guarantee)).
- **`admins`** — completely standalone operator logins for the `/admin`
  console. `email` (unique), `googleId` (unique, Google's `sub` claim). No
  password, no `familyId`, no link to `users` at all — see
  [§9](#9-admin-console--data-privacy-guarantee).
- **`family_members`** — the people/pets shown in the app (adult/teen/child/pet
  role, colour, avatar, name). `userId` optionally links a member profile to
  a login account. This isn't limited to the original signup owner — any
  member can later get their **own** login via the invite-link "connect to
  the app" flow (see [§5](#5-authentication)), giving that member's `users`
  row the same `familyId` so they see the same shared household data under
  their own email/password. `mapMember()`'s `hasAccount` boolean (derived
  from `userId != null`) is what the UI uses to show a "Connected" badge —
  the client never sees the raw `userId`.
- **`modules`** — the plug-in registry mirrored in the DB: `key` (matches
  `src/core/module-registry.ts`), `name`, `description`, `icon`, `isCore`.
- **`family_modules`** — per-family enable/disable state + a `config` jsonb
  column for per-module settings — stores a module's calendar feeds as
  `config.feeds: ModuleFeed[]` (each `{ id, label, url, lastSyncedAt }`), so
  a module like Sports can have **more than one** feed (e.g. one per
  kid/team). `readModuleFeeds()` in `db/queries.ts` transparently migrates
  the older single-feed shape (`config.feedUrl` + `config.lastSyncedAt`)
  into a one-item feeds list. See
  [§9](#9-admin-console--data-privacy-guarantee). Unique on
  `(familyId, moduleId)`.
- **`custom_services`** — family-defined, ad-hoc "services" that aren't one
  of the built-in modules (e.g. a college schedule, a one-off club or
  tournament). Optionally backed by its own single iCal/webcal `feedUrl`,
  synced the same upsert-by-UID way as a module's feed
  (`custom-services-queries.ts`'s `syncCustomServiceFeed`). With no feed
  it's just a label a manually-added event/board item can be tagged with.
- **`events`** — generic calendar events. Core fields (title, start/end,
  personIds, category, location, icon, colour) plus a `details` jsonb column
  modules can use for structured extra data (e.g. sports opponent, school
  term). `moduleId` records which module created it (nullable = manual/core);
  `customServiceId` links it to a `custom_services` row instead, if any.
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
- `GroundControlApp` (`"use client"`) owns all interactive state: active
  tab, nav-drawer open/closed, dark mode, current selected family member,
  and local copies of events/board items/modules (seeded from server props,
  then updated optimistically).
- Tabs (`today` / `week` / `remember` / `profile` / `family-admin` /
  `modules` / `kitchen` / `help`) are plain conditionally-rendered React
  state — **not routes**. Only one tab's component is mounted at a time. A
  fixed 4-item bottom dock (Today/My week/Add/Profile) and a slide-out nav
  drawer (all tabs, reached via a header menu button) both set this same
  state.
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
- **Authorization**: every Server Action and query that reads or mutates a
  specific event/board item/family member/module first checks it belongs to
  the caller's own `familyId` from the session — never trusts an id passed
  from the client alone.
- **Rate limiting** (`lib/rate-limit.ts`): a fixed-window, DB-backed limiter
  (a `rate_limits` table, atomic `INSERT ... ON CONFLICT`) applied to login,
  signup, invite-claim, and password-reset request/confirm — slows down
  brute-force/credential-stuffing attempts without needing an in-memory
  store (which wouldn't survive Vercel's stateless serverless instances).
- **Password reset** (`lib/auth/password-reset.ts`, `lib/email.ts`): a
  signed, short-lived, single-use reset token (same `createSignedToken`/
  `verifySignedToken` helper as sessions and member-invite links) emailed to
  the account's address via `/forgot-password` → `/reset-password`. Always
  returns the same success message regardless of whether the email matched
  an account, to avoid leaking which emails have accounts.
- **Required env var**: `SESSION_SECRET` (64-char hex recommended — generate
  with `openssl rand -hex 32`). Must be set in `.env.local` for local dev and
  in Vercel's Production/Preview/Development environment variables.

### Connecting an individual family member to their own login

The original signup flow only creates **one** login (the household owner).
To let another family member (e.g. a teen) get their own personal
email/password on their own phone — while still seeing the same shared
household data — Profile → a member's card → the link icon generates a
shareable **invite link**:

- `generateMemberInviteLinkAction(memberId)` (`lib/auth/actions.ts`) checks
  the caller is signed into that family, then calls
  `assertMemberInviteEligible()` (`db/auth-queries.ts`) — the target member
  must belong to the same family and not already have a `userId`.
- The link itself is a **stateless, signed token** (`lib/auth/member-invite.ts`,
  built on the same `createSignedToken`/`verifySignedToken` helper as
  sessions), encoding `{ familyId, memberId, exp }` with a 3-day expiry — no
  extra DB table needed to track outstanding invites.
- `app/invite/page.tsx` verifies the token and shows a small signup form
  (email + password) for that specific member. Submitting it
  (`claimMemberInviteAction`) re-checks eligibility, creates a new `users`
  row scoped to the same `familyId`, links it via
  `family_members.userId` (`claimFamilyMemberInvite()`), and signs the new
  user straight in.
- Because eligibility is re-checked at claim time too, a link can't be used
  twice (e.g. two tabs racing) or reused after someone else has already
  connected that profile — the page shows an "already connected" state
  instead.
- Editing a family member's name/role/avatar/colour (the pencil icon on the
  same card) is a separate, simpler flow: `updateFamilyMemberAction`
  (`app/actions.ts`) → `updateFamilyMember()` (`db/queries.ts`), reusing the
  `AddMemberModal` component in an "edit" mode (pre-filled fields, "Save"
  instead of "Add").

⚠️ Note: this is a lightweight, from-scratch auth system suitable for a
small personal/family app. Rate limiting and a password-reset flow are in
place (above), but there is still no email verification on signup, and no
CSRF-token-based protection beyond what Next.js Server Actions provide
natively.

---

## 6. Environment & local development

Required environment variables (see `.env.local`, gitignored):

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` / `POSTGRES_URL` / `PRISMA_DATABASE_URL` | Postgres connection strings (Vercel/Prisma Postgres provisioning) |
| `SESSION_SECRET` | HMAC signing key for session cookies |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials for `/admin` sign-in only (see [§9](#9-admin-console--data-privacy-guarantee)) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional — enables real password-reset emails via Resend (`lib/email.ts`); without these, reset emails are just logged to the server console (fine for local dev, not for production) |

```bash
npm install
npx vercel env pull .env.local --yes   # pull env vars from the linked Vercel project

npm run db:generate    # generate a new SQL migration file from schema.ts changes
npm run db:migrate     # apply any not-yet-applied migration files to the DB (production-safe)
npm run db:push        # push schema directly to the DB, no migration file (quick local iteration only)
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

**Recommended schema-change workflow:** run `npm run db:generate` after
editing `db/schema.ts`, commit the generated `drizzle/*.sql` file, then run
`npm run db:migrate` to apply it. `db:migrate` tracks what's already been
applied in a `drizzle.__drizzle_migrations` table, so it's safe to run
repeatedly and won't re-run old migrations. Reserve `db:push` for quick
throwaway local prototyping only — it applies schema changes directly with
no migration file and no applied-migrations record, so it's easy to drift
out of sync between environments or lose data on a destructive change.

(One-time historical note: this project's schema changes were applied via
`db:push` up through migration `0008`, so `db/baseline-migrations.ts` was run
once to mark those 9 already-applied migrations as done in
`drizzle.__drizzle_migrations` without re-running their SQL. That script
isn't needed again unless the tracking table is ever reset.)

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
5. **Admin console** — a `/admin` route, gated by its own completely
   separate operator login (`admins` table + `gc_admin_session` cookie,
   nothing to do with any family's `users` row), so an operator can
   configure connectors for any family without seeing that family's
   personal data. See [§9](#9-admin-console--data-privacy-guarantee) for
   the full design and the privacy guarantee this depends on.
6. **Custom services & calendar discovery** — a Modules → "Your services"
   flow for one-off things that aren't a built-in module (a college
   schedule, a specific club). `db/custom-services-queries.ts` mirrors the
   module feed-sync pattern for a single feed per service.
   `src/core/calendar-discovery.ts`'s `discoverCalendarFeeds()` lets someone
   paste in a plain website URL (e.g. a school's homepage) and get back
   candidate `.ics`/webcal links scraped from the page or guessed from
   common paths — shown as suggestions to pick from, never auto-applied.
7. **Multi-feed modules** — a module (e.g. Sports) can now hold **more than
   one** calendar feed (one per kid/team), each independently labelled,
   synced, and removable — see `ModuleFeed`/`readModuleFeeds()` in
   [§3](#3-data-model).
8. **Illustrated avatar & icon pack, cosmic auth redesign** — a proper
   illustrated icon set (`public/icon_pack/`, `src/core/avatars.ts`) for
   family member avatars, nav items, and categories; login/signup/admin
   login share a cosmic-themed shell (`auth-shell.tsx`,
   `cosmic-illustrations.tsx`).
9. **Editing family members & self-service login links** — parents can edit
   an existing family member's name/role/avatar/colour, and generate a
   shareable, expiring link that lets a family member set up their **own**
   personal login rather than sharing the household one — see
   [§5](#5-authentication).
10. **In-app Help screen** — a basic Help tab (`help-view.tsx`), reachable
    from Profile, walking through what each screen/icon does using the same
    illustrated icon pack.
11. **PWA** — `manifest.ts`, a service worker (`public/sw.js`), and
    generated app icons (`public/icon-192.png`, `icon-512.png`,
    `apple-touch-icon.png`) make Ground Control installable to a phone's
    home screen. The old "Mobile Phone / Kitchen Display / Full Screen"
    device-preview switcher was removed in favour of the app just being
    itself at any viewport size, with Kitchen Display as its own tab.
12. **Bills module, family admin, nav drawer, demo data** — a fourth
    optional module, **Bills & Renewals**; a new **Family Admin** tab
    (adults-only) hosting the household member list (switch/edit/invite/add
    a member), a "Manage modules" shortcut, and a "Remove demo data" action;
    a slide-out **nav drawer** (hamburger menu) as the primary navigation,
    with the bottom dock trimmed to 4 items (Today/My week/Add/Profile).
13. **Editable notes and events** — calendar events (Week view) and board
    items (Remember board) can now be edited and deleted after creation, not
    just created and checked off.
14. **Photo OCR and PDF import for the Add sheet** — "Scan text from a
    photo" (on-device OCR via `tesseract.js`) and "Import from a PDF"
    (`src/core/pdf-extract.ts`, via `pdfjs-dist`, surfaces candidate
    events with a date/time for the user to tap and auto-fill the form);
    plus a "Convert to calendar event" action when editing an existing
    note/task/reminder.
15. **Admin-created custom modules & family module requests** — an operator
    can create a household-agnostic custom module from `/admin` and assign
    it to specific families (`db/admin-queries.ts`'s
    `createCustomModule`/`setCustomModuleAssignment`/`deleteCustomModule`);
    families can use "Request a module" on the Modules screen
    (`db/module-requests-queries.ts`) to ask for one that doesn't exist yet,
    and an operator resolves the request (approved/declined, with an
    optional note) from `/admin`.
16. **Production hardening** — an authorization audit (every mutation/query
    checks the resource belongs to the caller's own family), DB-backed rate
    limiting (`lib/rate-limit.ts`) on auth-sensitive actions, root/route
    error boundaries with server-side error logging
    (`app/error.tsx`/`app/global-error.tsx`, `lib/log-error.ts`), a
    password-reset flow (`lib/auth/password-reset.ts`, `lib/email.ts`), a
    GitHub Actions CI pipeline (`.github/workflows/ci.yml`) running lint/
    typecheck/test/build on every push, a first pass of Vitest unit tests,
    security response headers (`next.config.ts`), a switch to
    `drizzle-kit migrate` as the reviewed, tracked schema-change workflow
    (see [§6](#6-environment--local-development)), and a documented
    database backup policy (see [§10](#10-database-backup-policy)).
17. **Invite-link revocation** — generating a new "connect to the app" link
    for a family member now invalidates any older, still-unexpired one for
    that member. See the invite-link bullet in
    [§8](#8-known-gaps--things-to-be-aware-of) for how the version-bump
    scheme works.

Planned but not yet built (roadmap):
18. Kitchen Display further polish.
19. More connector types beyond calendar feeds (maps, food/meal planning,
    college schedules, etc.) — the module registry + `family_modules.config`
    jsonb pattern is designed to support this without further schema
    changes; each new connector type is just a new module registry entry +
    a parser function alongside `parseIcalFeed`.
20. Invite links currently have no delivery mechanism built in (no SMS/email
    send) — the parent copies the link and shares it themselves (text,
    AirDrop, etc). Sending it automatically would need an email/SMS
    provider.
21. No automated off-provider database backup job yet (see
    [§10](#10-database-backup-policy)) and no email verification on signup.

---

## 8. Known gaps / things to be aware of

- `src/core/modules.ts` (the static `modules` array derived from the
  registry) is currently unused by any component; `db/queries.ts`'s
  `getFamilyModules()` is the real source of per-family module state.
- ESLint has 8 pre-existing warnings (0 errors): plain `<img>` tags in
  several components (`next/image` would be more optimal but isn't a drop-in
  replacement for the icon-pack/avatar usage here), one `useEffect` missing-
  dependency warning in `add-modal.tsx`, and one custom-font warning in
  `layout.tsx`. None are new/introduced by recent phases — check
  `npm run lint` output before assuming a change caused a regression.
- The invite-link ("connect to the app") flow supports revocation: the
  token is stateless (family/member id + expiry, HMAC-signed — see
  `lib/auth/member-invite.ts`) but also embeds a snapshot of
  `family_members.invite_token_version` at issue time. Generating a new
  link (`generateMemberInviteLinkAction`) bumps that column and
  auto-invalidates any older, still-unexpired link; `revokeMemberInviteLinkAction`
  bumps it without minting a replacement, for an explicit "Revoke this
  link" action in `invite-link-modal.tsx`. Verification (both on the
  `/invite` page and in `claimMemberInviteAction`) rejects a token whose
  `v` no longer matches the member's current version.
- No email verification on signup — a typo'd or someone-else's email can be
  used to create a household. Low risk for a personal/family app, but worth
  knowing before treating an email address as a verified identity.
- Password-reset (and any future transactional) email goes through
  `lib/email.ts`, which sends via Resend if `RESEND_API_KEY`/`EMAIL_FROM`
  are set, and otherwise just logs the email to the server console — handy
  for local dev, but means reset emails won't actually be delivered in a
  deployment that hasn't configured Resend yet. The "forgot password" UI
  always shows the same success message either way, so check server logs
  first if a reset email doesn't arrive.

---

## 9. Admin console & data-privacy guarantee

Ground Control is multi-tenant: every household is an isolated `family`. As
connectors (calendar feeds, and future integrations — maps, food, college
schedules, etc.) are added, someone needs to be able to configure them on a
family's behalf (pasting in a feed URL, troubleshooting a sync) without that
becoming a backdoor into other households' private data. `/admin` is built
so that's true **by construction**, not just by policy — and admin identity
is **completely separate** from any family's login, not a special power
layered on top of one.

### Admin identity is not a family login
There is no such thing as "a family user who is also an admin":
- Admin logins live in their own `admins` table (`db/schema.ts`) — `email` +
  `googleId` (Google's `sub` claim) only, **no password at all**. It has
  **no `familyId` column and no relationship to `users`/`families` at all.**
- The `/admin/login` screen (`app/admin/login/page.tsx`) is a single
  "Continue with Google" button — a completely separate sign-in flow from
  `/login`, and a different identity provider path entirely (Google OAuth vs.
  the hand-rolled password check family logins use). Signing in there sets a
  distinct cookie, `gc_admin_session` (`lib/auth/admin-session.ts`), never
  the family `gc_session` cookie — the two sessions share only the
  underlying HMAC signing helper (`lib/auth/token.ts`) to avoid duplicating
  crypto code, not the payload shape, cookie name, or lifetime (12 hours for
  admin sessions vs. 30 days for family sessions).
- Your own family account (e.g. the demo `dad@example.com` login) is an
  ordinary row in `users` like any other household's — it cannot be
  "promoted" to admin, and has no `isAdmin`-style flag to flip. Operating
  the deployment and being a household using the app are two entirely
  unrelated identities.

### Who can access it
Access is gated by **two independent checks**, both of which must pass:
1. **Google sign-in succeeds** and Google reports `email_verified: true` for
   the account (`lib/auth/google-oauth.ts`).
2. **The verified email is in a hardcoded allowlist**
   (`lib/auth/admin-allowlist.ts` — currently just `onezeronine@gmail.com`).
   This is checked in `app/admin/auth/google/callback/route.ts` **before**
   an `admins` row is ever created or a session is ever issued. Completing
   Google sign-in with some other Google account does not grant access —
   the callback rejects it and redirects to `/admin/login?error=...` without
   touching the database at all.
- The allowlist is a plain array in source code, not a database table or
  in-app setting — changing who can ever be admin requires a code change
  and redeploy, not a UI action or DB write.
- The OAuth flow includes CSRF protection: a random `state` value is set in
  a short-lived (`gc_admin_oauth_state`, 10 min) cookie before redirecting
  to Google, and the callback rejects the request if the returned `state`
  doesn't match.
- The first time the allowlisted email signs in, `upsertAdminFromGoogleProfile`
  (`db/admin-auth-queries.ts`) creates its `admins` row automatically; on
  every later sign-in it just re-verifies and reuses that row (updating
  `googleId` if it ever changes).
- `lib/auth/admin.ts`'s `requireAdmin()` re-reads the admin row from the
  database on every request (never trusts the cookie payload alone), so
  deleting the `admins` row revokes access on the very next request.
- Non-admins/failed sign-ins are redirected to `/admin/login` (not shown a
  403), so the route's existence isn't signalled to regular users.
- Setup requires a Google Cloud OAuth Client ID/Secret
  (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` env vars) with
  `<app-origin>/admin/auth/google/callback` registered as an authorized
  redirect URI — see the Google Cloud Console OAuth consent screen +
  credentials setup. No email-sending infrastructure is needed (this is
  OAuth, not magic-link email).
- The admin console has its own logout button (`adminLogoutAction`),
  independent of the family "log out" in Profile.

### What the admin console can see and do
Everything under `/admin` (`app/admin/page.tsx`, `app/admin/actions.ts`,
`app/components/admin-view.tsx`, `db/admin-queries.ts`) is scoped to exactly
these things, for **any** family:
1. Family name, member **names** (for identification — "which household is
   this"), and the account owner's email.
2. Which modules (Sports/School/Life/Bills/custom...) are enabled or
   disabled.
3. A module's connector config: the feed URL, last-synced timestamp, and a
   button to trigger a sync (showing only a created/updated **count**, never
   the synced events' content).
4. Creating/deleting a **custom module** (name, description, icon, colour)
   and assigning/unassigning it to specific families — for a feature a
   household needs that isn't in the built-in registry yet.
5. Viewing and resolving **module requests** a family has submitted
   (approve/decline with an optional note) via "Request a module" on their
   Modules screen.

### What it deliberately cannot see
`db/admin-queries.ts` only ever selects from `families`, `family_members`
(names only), `users` (email only), `modules`, `family_modules`, and
`module_requests` (the request text/reason a family chose to submit, not
their calendar/board data). It has
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

---

## 10. Database backup policy

The database is Prisma Postgres (host `db.prisma.io`, provisioned through
the Vercel integration — see `DATABASE_URL`/`POSTGRES_URL`/
`PRISMA_DATABASE_URL` in [§6](#6-environment--local-development)).

**Automatic, provider-side:** on paid Prisma Postgres plans, Prisma takes a
daily snapshot of the database (only on days with activity) and retains a
plan-dependent number of them. Restores are done from the **Backups** tab of
the database's page in the [Prisma Console](https://console.prisma.io/) —
there is nothing to configure in this repo for that baseline protection.
Anything written after the most recent snapshot is not covered, so this
alone is not a substitute for a pre-change safety net (see below).

**Point-in-time recovery (PITR):** Prisma's own docs are currently
inconsistent about whether this has shipped yet for Prisma Postgres — check
the [Backups](https://www.prisma.io/docs/postgres/database/backups) page in
the Prisma docs before relying on it, rather than assuming it's available.

**Before risky changes (recommended manual step):** take an explicit backup
before running a destructive migration, a `db:push --force`, or a bulk data
edit against production. With the Postgres client tools installed locally
(`pg_dump`/`psql` — not bundled with this project, since they're system
binaries, not npm packages) and a **direct** (non-pooled) connection string:

```bash
pg_dump --no-owner --format=custom \
  --dbname="$DIRECT_DATABASE_URL" \
  --file="backup-$(date +%Y%m%d-%H%M%S).dump"
```

Store that `.dump` file somewhere outside the repo (it contains real
household data) — `*.dump` is gitignored, but don't rely on that alone;
keep backups out of the repo entirely. To restore:

```bash
pg_restore --no-owner --clean --if-exists \
  --dbname="$DIRECT_DATABASE_URL" backup-<timestamp>.dump
```

**What's not yet in place:** there is no automated off-provider backup job
(e.g. a scheduled GitHub Action running `pg_dump` to external storage). If
Ground Control ever holds data that must survive a full loss of the Prisma
account/project (not just a bad migration), that would be the next step —
out of scope here since it requires provisioning external storage and
credentials outside this repo.
