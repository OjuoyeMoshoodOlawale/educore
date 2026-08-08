# EduCore

Real, running application — not mockups. Phase 1 (school settings + staff + allocation) is wired end to end: Express API, MySQL-ready schema (running on SQLite for local dev), JWT auth, and a Vue 3 + Tailwind client.

## Stack

- **Server:** Express, Knex (SQLite locally, MySQL in production — swap `DB_CLIENT` in `.env`), JWT auth (access + refresh), zod validation.
- **Client:** Vue 3 (Composition API, `<script setup>`), Pinia, Vite, Tailwind, installable as a PWA.

## Run it locally

You have two options for the database — both run the exact same migrations:

**Option A — MySQL via XAMPP (recommended, matches production):**
1. Start MySQL in XAMPP's control panel.
2. Create a database named `educore` (phpMyAdmin, or `mysql -u root -e "CREATE DATABASE educore;"`).
3. In `server/.env`, set `DB_CLIENT=mysql2` and `DB_USER=root` (XAMPP's default has no password).

**Option B — SQLite (zero setup):** leave `server/.env` as `DB_CLIENT=sqlite3` — no database server needed at all.

```bash
# Server
cd server
cp .env.example .env        # edit DB_CLIENT per the options above; replace the JWT secrets for anything beyond local dev
npm install
npx knex migrate:latest
npx knex seed:run           # creates a demo school + one login per role, all password changeme123
npm run dev                 # http://localhost:4000

# Client (separate terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

**Seeded logins** (all `changeme123`): `admin@educore.dev`, `principal@educore.dev`, `classteacher@educore.dev`, `subjectteacher@educore.dev`, `bursar@educore.dev`, `developer@educore.dev`. Every role except `developer` has a real linked `staff` record, so actions they take (recording a payment, adding an adjustment) attribute correctly.

## What's real right now

- **Auth** — JWT access token (15 min) + httpOnly refresh cookie (30 days), auto-refresh on 401, the non-enumerable "incorrect email or password" message from `ux-design.md` §2.
- **Settings — all screens live:** school profile, academic calendar (collapsible sessions, lazy-loaded terms, auto-creates 3 terms per session, single "current term" pivot), classes & sections (real drag-to-reorder, native HTML5 DnD, persisted on drop), subjects (inline-editable max scores), grading scale (star-rating legend), number sequences (token-format builder with presets + live preview — the SchoolFees Manager pattern from `schoolfees-manager-alignment.md` §5).
- **Staff** — list + modal-based add, staff number drawn live from the configured number sequence.
- **Allocation** — class-teacher assignment, and subject-teacher assignment with **multiple teachers per class-subject verified working** (two different teachers assigned to the same Mathematics/JSS 1/term combination, both show up independently — not an upsert-replace).
- **Base component kit** — `Modal`, `Confirm`, `Toast`/`useToast`, `Field`, `DataTable`, `StatusBadge`, `PageHeader`, `Spinner`, `CurrencyInput`, `StarRating` — all in `client/src/components/base/`, one file each.
- **Grading scale is fully editable** — grade boundaries and the psychomotor/affective star-rating legend are school-custom, with real add/edit/delete, not just a fixed seeded default.
- **Students** — list, add (with one-to-many guardians, unlike the legacy single-contact model), profile page with the real fee ledger.
- **Fees** — fee items, per-class fee structure (with copy-from-term), adjustments, payment accounts, payment recording with auto-generated receipt numbers, carry-forward balance calculation (verified against real numbers: opening balance + current charges − payments), a defaulters report endpoint.
- **Mobile responsiveness** — the app shell's sidebar is a slide-over drawer below the `md` breakpoint (hamburger toggle, backdrop, auto-closes on navigation); tables that could overflow scroll horizontally instead of breaking layout.
- **Runs on MySQL or SQLite interchangeably** — same migrations, verified against both.

Phase 1 (`milestones.md`) is complete. Phase 2's core (students + fees) is built and verified end to end against real MySQL, though the client-side "current class/term" pickers on a couple of forms are still plain number inputs rather than real dropdowns (see "What's next").

## Real bugs found and fixed while building this

Worth knowing about even independent of this project:
- **Express 4 does not catch promise rejections from `async` route handlers.** Any thrown error inside one (a bad foreign key, a DB connection drop) crashed the whole Node process instead of returning a 500 — this was quietly causing every "random" server crash during development. Fixed by upgrading to **Express 5**, which catches these automatically.
- **`users.id` vs. `staff.id` confusion** — several routes were attributing actions (`payments.received_by_staff_id`, `fee_adjustments.created_by_staff_id`) using the logged-in user's ID directly, but those columns reference the `staff` table, which `users.staff_id` only optionally links to. SQLite let this slide silently (no FK enforcement by default); MySQL's strict foreign-key checking caught it immediately. Fixed by carrying `staff_id` in the JWT payload and using that instead — the seed now creates a real linked `staff` row per test user so this is exercised, not just theoretically fixed.
- A unique constraint name on `subject_teacher_assignments` exceeded MySQL's 64-character identifier limit (SQLite has no such limit) — fixed with an explicit shorter name.

These are exactly the class of bug that "works fine in dev, breaks in production." Testing against real MySQL from early on — not just SQLite — is what caught all three.

## What's next

Fee reports/exports UI (the defaulters API exists, no screen yet), notification log, replacing the remaining plain-number class/term inputs with real pickers, then results/report cards, promotion/graduation, and accounting per `milestones.md` and `addendum-v4.md`.

## Folder structure

```
educore/
├── server/src/
│   ├── modules/{auth,schools,staff,students,fees}/   # routes per domain — more modules land per phase
│   ├── helpers/                         # numberSequence.js, validate.js, asyncHandler.js — cross-module logic
│   ├── middleware/auth.js               # JWT verify + role guard
│   └── db/{migrations,seeds}/
└── client/src/
    ├── components/base/                 # the reusable kit above
    ├── views/{auth,settings,staff,students}/     # mirrors server/src/modules/ naming
    ├── stores/auth.js
    └── api/client.js                    # axios instance, auto token-refresh
```

## Deploying

Server targets MySQL on cPanel-style hosting (per `plan.md`) — set `DB_CLIENT=mysql2` and the `DB_*` vars in production `.env`, then `npx knex migrate:latest` against the real database. Nothing in the migrations uses SQLite- or MySQL-only syntax, so the same migration files run against either.
