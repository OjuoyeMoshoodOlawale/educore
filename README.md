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
npx knex seed:run           # creates a full demo school — see "Demo data" below
npm run dev                 # http://localhost:4000

# Client (separate terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

**Seeded logins** (all `changeme123`): `admin@educore.dev`, `principal@educore.dev`, `classteacher@educore.dev`, `subjectteacher@educore.dev`, `bursar@educore.dev`, `developer@educore.dev`. Every role except `developer` has a real linked `staff` record, so actions they take (recording a payment, adding an adjustment) attribute correctly.

**Demo data** (all in the one seeded school, Second term 2025/2026): 3 classes (JSS 1–3), 5 subjects, 8 staff (5 with the logins above, plus 3 unlinked teachers so allocation has a real pool — including Mathematics on JSS 2 deliberately assigned to *two* teachers, to exercise the multi-teacher-per-subject case), 8 students spread across the 3 classes with guardians, fee structures for every class, payments left intentionally mixed — paid up, partial, and untouched — so the defaulters report has something real to show, subject scores/psychomotor/affective ratings/attendance for JSS 2's three students (Chidinma Eze ranks 1st at 88.6%, Amina Yusuf 2nd at 82.4%, Tunde Okafor 3rd at 72% — verified via the actual ranking endpoint, not asserted), and JSS 2's second term is pre-published so the report card, broadsheet, and public result-check page all have something to show without any manual setup. Try the result checker with `ISS/2026/0145` (Amina).

## What's real right now

- **Auth** — JWT access token (15 min) + httpOnly refresh cookie (30 days), auto-refresh on 401, the non-enumerable "incorrect email or password" message from `ux-design.md` §2, rate-limited (10 attempts / 15 min, same limiter applied to the public result-check endpoint per `engineering-design.md` §3).
- **Settings — all screens live:** school profile, academic calendar (collapsible sessions, lazy-loaded terms, auto-creates 3 terms per session, single "current term" pivot), classes & sections (real drag-to-reorder, native HTML5 DnD, persisted on drop), subjects (inline-editable max scores), grading scale (star-rating legend), number sequences (token-format builder with presets + live preview — the SchoolFees Manager pattern from `schoolfees-manager-alignment.md` §5).
- **Staff** — list + modal-based add, staff number drawn live from the configured number sequence.
- **Allocation** — class-teacher assignment, and subject-teacher assignment with **multiple teachers per class-subject verified working** (two different teachers assigned to the same Mathematics/JSS 1/term combination, both show up independently — not an upsert-replace).
- **Base component kit** — `Modal`, `Confirm`, `Toast`/`useToast`, `Field`, `DataTable`, `StatusBadge`, `PageHeader`, `Spinner`, `CurrencyInput`, `StarRating` — all in `client/src/components/base/`, one file each.
- **Grading scale is fully editable** — grade boundaries and the psychomotor/affective star-rating legend are school-custom, with real add/edit/delete, not just a fixed seeded default.
- **Students** — list, add (with one-to-many guardians, unlike the legacy single-contact model), profile page with the real fee ledger.
- **Fees — split to match how you'd actually navigate it:** Fee items (Settings → Fees → Fee items) is its own screen for defining what a school charges for (Tuition, Sports levy, PTA levy...) — separate from Fee structure, which is where an amount gets set per class/term with eligibility rules. This mirrors SchoolFees Manager's own `FeeItemsPage`/`BillConfigPage` split rather than bundling both into one screen. Also live: payment accounts settings (cash/bank, e.g. "Zenith Bank — 2219098987"), a defaulters report, adjustments and payment recording built into the student profile ledger view. Carry-forward balance calculation verified against real numbers (opening balance + current charges − payments) on real MySQL data, with auto-generated receipt numbers from the same token-sequence engine as admission/staff numbers.
- **Psychomotor/affective traits are school-editable, not a fixed list** — add, edit, and reorder under Settings → Psychomotor & affective traits. Removing one is a soft delete: it stops appearing for new ratings but never destroys a student's existing rating on it (verified: deactivated "Handwriting" after Chidinma Eze already had a 5-star rating on it, her report card still shows it).
- **Sidebar is properly collapsible** — Fees, Staff, Results, Term end, and Settings are each an expandable group (defaults open if you're already on a page inside it), not a flat scrolling list.
- **Mobile responsiveness** — the app shell's sidebar is a slide-over drawer below the `md` breakpoint (hamburger toggle, backdrop, auto-closes on navigation); tables that could overflow scroll horizontally instead of breaking layout.
- **Runs on MySQL or SQLite interchangeably** — same migrations, verified against both.

Phase 1 (`milestones.md`) is complete. Phase 2 (students + fees) is complete. Phase 3 (results + report cards) is complete. Phase 4 is complete: promotion (append-only, idempotent), graduation (terminal), and a combined fees + results public portal — one admission-number lookup shows both, with a fee-related block withholding only the results (not the balance itself, since the parent needs to see what's owed to resolve it). **Phase 5 is complete**: real notification settings with encrypted SMTP/SMS credentials and actual delivery attempts (verified end-to-end against a local test SMTP server — not simulated), bulk send, and a recruitment module with a public application form, pipeline board, and a one-click hire-to-staff shortcut.

**All five phases in `milestones.md` are now built.**

**Since then:** the fee module was rebuilt to match `schoolfees-manager`'s real, tested logic exactly (its source was read directly, not from memory) — materialized bills via a Generate Bills action, snapshotted carry-forward via auto-compute, and the same adjustment validation rules (type + calc_mode, mandatory reason, percent/fixed caps). A developer-only console now gates the fees and results modules behind per-school activation, matching `schoolfees-manager`'s own DevSettingsPage pattern.

## Real bugs found and fixed while building this

Worth knowing about even independent of this project:
- **Express 4 does not catch promise rejections from `async` route handlers.** Any thrown error inside one (a bad foreign key, a DB connection drop) crashed the whole Node process instead of returning a 500 — this was quietly causing every "random" server crash during development. Fixed by upgrading to **Express 5**, which catches these automatically.
- **`users.id` vs. `staff.id` confusion** — several routes were attributing actions (`payments.received_by_staff_id`, `fee_adjustments.created_by_staff_id`) using the logged-in user's ID directly, but those columns reference the `staff` table, which `users.staff_id` only optionally links to. SQLite let this slide silently (no FK enforcement by default); MySQL's strict foreign-key checking caught it immediately. Fixed by carrying `staff_id` in the JWT payload and using that instead — the seed now creates a real linked `staff` row per test user so this is exercised, not just theoretically fixed.
- A unique constraint name on `subject_teacher_assignments` exceeded MySQL's 64-character identifier limit (SQLite has no such limit) — fixed with an explicit shorter name.

These are exactly the class of bug that "works fine in dev, breaks in production." Testing against real MySQL from early on — not just SQLite — is what caught all three.

## What's next

Everything in `milestones.md` Phases 1–5 is built. What's left is scoped in later docs rather than the milestone list itself:
- **Phase 6** (`addendum-v4.md` §11): fine-grained permission overrides — **done** (5 representative capabilities; extending coverage to more routes is incremental from here, not a new mechanism). Still open: optimistic-locking/live-edit awareness for concurrent editing, PWA polish, timetable module.
- **Phase 7**: role-based dashboards (`dashboards/` module — different layouts per role, not just filtered data).
- **Phase 8**: the developer/platform console (cross-school SMTP/SMS/Paystack key management, module licensing, error logs, usage analytics) — a genuinely separate tier from anything built so far, since everything here has been single-school-scoped.
- **Phase 9** (`accounting-rules-of-engagement.md`): sundry sales and double-entry accounting, with the chart-of-accounts and auto-posting rules already defined, not yet built.

Smaller open items: the SMS provider integration is written against a generic Termii-shaped API but has never been tested against a real account/key (only the encryption/storage and the honest-failure path are verified); a couple of forms still reference class/term by raw ID in places a friendlier picker would help; recruitment resume upload isn't wired (the `resume_url` column exists, no file upload UI yet).

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
