# EduCore

Real, running application — not mockups. Phase 1 (school settings + staff + allocation) is wired end to end: Express API, MySQL-ready schema (running on SQLite for local dev), JWT auth, and a Vue 3 + Tailwind client.

## Stack

- **Server:** Express, Knex (SQLite locally, MySQL in production — swap `DB_CLIENT` in `.env`), JWT auth (access + refresh), zod validation.
- **Client:** Vue 3 (Composition API, `<script setup>`), Pinia, Vite, Tailwind, installable as a PWA.

## Run it locally

```bash
# Server
cd server
cp .env.example .env        # generates working defaults; replace the JWT secrets for anything beyond local dev
npm install
npx knex migrate:latest
npx knex seed:run           # creates a demo school + admin@educore.dev / changeme123
npm run dev                 # http://localhost:4000

# Client (separate terminal)
cd client
npm install
npm run dev                 # http://localhost:5173
```

Sign in with `admin@educore.dev` / `changeme123`.

## What's real right now

- **Auth** — JWT access token (15 min) + httpOnly refresh cookie (30 days), auto-refresh on 401, the non-enumerable "incorrect email or password" message from `ux-design.md` §2.
- **Settings — all screens live:** school profile, academic calendar (collapsible sessions, lazy-loaded terms, auto-creates 3 terms per session, single "current term" pivot), classes & sections (real drag-to-reorder, native HTML5 DnD, persisted on drop), subjects (inline-editable max scores), grading scale (star-rating legend), number sequences (token-format builder with presets + live preview — the SchoolFees Manager pattern from `schoolfees-manager-alignment.md` §5).
- **Staff** — list + modal-based add, staff number drawn live from the configured number sequence.
- **Allocation** — class-teacher assignment, and subject-teacher assignment with **multiple teachers per class-subject verified working** (two different teachers assigned to the same Mathematics/JSS 1/term combination, both show up independently — not an upsert-replace).
- **Base component kit** — `Modal`, `Confirm`, `Toast`/`useToast`, `Field`, `DataTable`, `StatusBadge`, `PageHeader`, `Spinner`, `CurrencyInput`, `StarRating` — all in `client/src/components/base/`, one file each.

Phase 1 (`milestones.md`) is complete: every screen has both a working API route and a working Vue page, tested end to end over curl and a clean `vite build`.

## What's next

Everything from Phase 2 onward (fees, results, promotion, accounting) per `milestones.md` and `addendum-v4.md`. The "current term" used by the allocation screen is hardcoded (`CURRENT_TERM_ID = 2` in `Allocation.vue`) since there's no global current-term picker in the UI yet — worth wiring once a second module needs it too, rather than each new screen hardcoding its own.

## Folder structure

```
educore/
├── server/src/
│   ├── modules/{auth,schools,staff}/   # routes per domain — more modules land per phase
│   ├── helpers/                         # numberSequence.js, validate.js — cross-module logic
│   ├── middleware/auth.js               # JWT verify + role guard
│   └── db/{migrations,seeds}/
└── client/src/
    ├── components/base/                 # the reusable kit above
    ├── views/{auth,settings,staff}/     # mirrors server/src/modules/ naming
    ├── stores/auth.js
    └── api/client.js                    # axios instance, auto token-refresh
```

## Deploying

Server targets MySQL on cPanel-style hosting (per `plan.md`) — set `DB_CLIENT=mysql2` and the `DB_*` vars in production `.env`, then `npx knex migrate:latest` against the real database. Nothing in the migrations uses SQLite- or MySQL-only syntax, so the same migration files run against either.
