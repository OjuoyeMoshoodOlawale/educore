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
- **Settings** — school profile, academic calendar (collapsible sessions, lazy-loaded terms, auto-creates 3 terms per session, single "current term" pivot — the SchoolFees Manager pattern from `schoolfees-manager-alignment.md` §4).
- **Staff** — list + modal-based add, with the staff number drawn live from the configured number sequence (token-format engine in `server/src/helpers/numberSequence.js`, matching `schoolfees-manager-alignment.md` §5).
- **Number sequences** — the token-format engine and presets are built server-side; the settings *screen* for editing formats isn't wired yet (API is ready: `GET/PUT /api/schools/number-sequences`).
- **Multiple teachers per class-subject** — the schema and API support it (`POST /api/staff/allocation/subject-teacher` is a plain insert, not an upsert-replace); the allocation UI screen itself isn't built yet.
- **Base component kit** — `Modal`, `Confirm`, `Toast`/`useToast`, `Field`, `DataTable`, `StatusBadge`, `PageHeader`, `Spinner`, `CurrencyInput`, `StarRating` — all in `client/src/components/base/`, one file each, no framework beyond Vue + Tailwind.

## What's scaffolded but not built yet

Classes/sections/subjects/grading-scale settings screens (API routes exist in `schools.routes.js`, no Vue pages yet), and everything from Phase 2 onward (fees, results, promotion, accounting) per `milestones.md` and `addendum-v4.md`.

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
