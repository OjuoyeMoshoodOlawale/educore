# CLAUDE.md — Context for Claude Code

Read this first, then `README.md`, then whichever `docs/` file matches what you're working on. This file exists so a fresh Claude Code session (or a fresh chat session) picks up the same patterns already established here, instead of re-deriving them.

## What this project is

EduCore — a school management web app (Vue 3 + Express + MySQL/SQLite), rebuilding a legacy PHP school portal properly. Placeholder name, not finalized. Full context in `docs/plan.md` (architecture, DB schema, the legacy system's actual features and bugs) and `docs/milestones.md` (the phase-by-phase build order — **follow this order**, each phase is meant to be independently deployable).

## Read these in `docs/` before writing code

- **`plan.md`** — architecture, full DB schema reasoning, the ranking/promotion algorithms recovered from the legacy system, and the reasoning behind the scratch-card-checker removal and the number-sequence design.
- **`milestones.md`** — the phase order. Phase 1 (settings/staff/allocation) and Phase 2's core (students/fees) are done — see "Current state" below.
- **`engineering-design.md`** — code style (template literals not string concatenation, one API response contract, the security requirements — parameterized queries only, no dynamic column names from request input) and the base component API contracts.
- **`ux-design.md`** — visual/interaction spec for every reusable component, matched against what's actually built in `client/src/components/base/`.
- **`schoolfees-manager-alignment.md`** — patterns pulled directly from a sibling project's real source (`OjuoyeMoshoodOlawale/schoolfees-manager`), several of which changed direction mid-project: the token-format number sequence engine, the collapsible/lazy-loaded sessions UI, and the "one compact base-component file" philosophy all came from studying that repo, not from the original design docs. When in doubt about a UI pattern, this file overrides the earlier `plan.md`/`ux-design.md` guidance.
- **`addendum-v4.md`** — a large batch of later decisions: JWT over sessions, PWA installability, multi-teacher-per-subject support, star ratings for psychomotor/affective, payment accounts, role-based dashboards, a developer/platform console, and — importantly — §10.5's resolution for score-calculation edge cases (mid-session joiners, dropped subjects, changing grading scales). Read that section before touching anything in the results/report-card module.
- **`accounting-rules-of-engagement.md`** — scope and rules for the (not-yet-built) accounting + sundry sales modules, Phase 9. Don't build these without reading this first — there's a specific double-entry/immutable-ledger/period-locking design already agreed.
- **`00-original-brand-design.md`** — the original brand/token design (colors, the first pass at the fees schema). Superseded in places by later docs, kept for history.

## Current state (check `git log` for the real up-to-date picture)

Phase 1 is complete and verified end-to-end (not just written — every endpoint was curl-tested, the client build was verified clean). What exists:

**Server** (`server/src/`):
- `modules/auth/` — JWT login (access + refresh), the non-enumerable wrong-password message, zod validation
- `modules/schools/` — profile, sessions/terms (collapsible + lazy-load pattern, single "current term"), sections, classes (drag-reorder), subjects (per-subject max scores), **grading scale (fully editable — school-custom, not just seeded defaults)**, number sequences
- `modules/staff/` — CRUD, allocation (class-teacher + subject-teacher, **multi-teacher-per-subject verified working**)
- `modules/students/` — CRUD with one-to-many guardians, auto admission numbers
- `modules/fees/fees.service.js` — the ledger math: `openingBalance + currentCharges - currentPaid`, verified against real numbers
- `modules/fees/` routes — fee items, per-class structure (with copy-from-term), adjustments, payment accounts, payments (auto receipt numbers, reversal not delete), a defaulters report
- `helpers/numberSequence.js` — the token-format engine ({PREFIX}/{YEAR}/{SEQ4} etc.), matches SchoolFees Manager's pattern
- `helpers/asyncHandler.js` — no longer needed for new routes (see "Express 5" below) but kept for reference
- `db/migrations/` — 7 migration files, SQLite-and-MySQL-compatible syntax only, verified against **real MySQL**, not just SQLite

**Client** (`client/src/`):
- `components/base/` — Modal, Confirm, Toast/useToast, Field, DataTable, StatusBadge, PageHeader, Spinner, CurrencyInput, StarRating — one file each, follow this shape for anything new
- `views/settings/` — SchoolProfile, AcademicCalendar, ClassesSections, Subjects, GradingScale (editable), NumberSequences — all real, all API-wired
- `views/staff/` — StaffList, Allocation
- `views/students/` — StudentList, StudentForm, StudentProfile (the real fee ledger UI, with payment/adjustment modals)
- `App.vue` — mobile-responsive shell: sidebar becomes a slide-over drawer below `md`, hamburger toggle, auto-closes on navigation

**Not built yet:** fee reports/exports UI, notification log, results/report cards, promotion/graduation, accounting, recruitment, dashboards module, developer console.

## Two real bugs found and fixed while building this — know about these before writing new routes

1. **Express 4 doesn't catch async route-handler rejections** — an unhandled promise in an `async (req, res) => {...}` handler crashed the whole process instead of returning a 500. Fixed by upgrading to **Express 5** (already done — `package.json` pins `^5.2.1`), which catches these automatically. You don't need to wrap new handlers in anything special; Express 5 just works. (`helpers/asyncHandler.js` exists from before this was discovered — safe to ignore for new code.)
2. **`req.user.id` is a `users.id`, not a `staff.id`.** Any column that references `staff` (like `payments.received_by_staff_id`) must use `req.user.staff_id` (carried in the JWT payload, set at login), never `req.user.id`. SQLite let this slide silently with no FK enforcement; MySQL's strict checking caught it immediately. **Always test against real MySQL, not just SQLite** — this is exactly why.

## Patterns to keep following

1. **Module-mirrored naming** — `server/src/modules/<domain>/` and `client/src/views/<domain>/` use the same domain name. Keep this for every new module.
2. **Modal-first CRUD** — adding a record is a modal, not a new route, unless the form is genuinely page-length (multi-section, its own sub-nav).
3. **One API response shape** — `{success, data}` / `{success, errors:[{field,message}]}` / `{success, message}`. Every route follows this, no exceptions.
4. **Server-side validation is the real boundary** — zod on every mutating route, never trust client-side checks alone.
5. **Auto-generated IDs, never client-supplied** — admission numbers, staff numbers, receipt numbers all come from `nextInSequence()`, never a form field.
6. **Real verification before calling something done** — run migrations, seed, curl the actual endpoints, build the client. Don't mark a phase complete on written-but-unrun code.

## Running it

See `README.md` for exact commands and both DB options (MySQL/XAMPP or SQLite). Short version: `cd server && npm install && npx knex migrate:latest && npx knex seed:run` (creates one login per role, all `changeme123`), `npm run dev`, then `cd client && npm install && npm run dev`.
