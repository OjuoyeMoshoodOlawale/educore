# EduCore — Addendum v4

Written before continuing further design work, as asked. This is dense — organized by topic, with the direct questions answered first.

---

## 1. Direct answers

**"When are you writing the backend — after the phases or when?"**
The phases in `milestones.md` were never meant to be all-frontend-then-all-backend — each phase is a full vertical slice (schema + API + UI) for one part of the system, deployable on its own. What's been delivered so far (Phases 1–3) is the **frontend design layer only** — static HTML standing in for what the Vue app will look like, so the visual direction could be agreed on before writing real application code. Given the Vue conversion decision below, the actual next step is: build Phase 1 for real (Express API + MySQL + Vue app, not static HTML) before moving to Phase 2's real build — not "finish all frontend mockups, then start the backend." Worth confirming: do you want me to convert the existing Phase 1–3 mockups into real Vue components next, or start Phase 1's real backend+frontend from scratch using the mockups purely as the visual reference?

**"Will you add more phases?"**
Yes — this addendum adds a Phase 6 (Dashboards module) and expands what's in the existing Phase 6/"polish" phase in `milestones.md` with a developer/platform console (§9 below). Updated phase list is in §11.

**On the GitHub repo / token**
I don't carry API tokens or credentials between sessions — nothing "since then" persists on my side, so I don't currently have write access to `OjuoyeMoshoodOlawale/educore`. If you connect a GitHub account/token in this session (via a connector, or by pasting a token for this conversation only), I can push directly; otherwise the pattern that works is: I keep building here, you `git pull`/copy the files locally or through Claude Code, and push from there — which is also exactly the handoff you mentioned wanting to do anyway. I won't store or reuse any token beyond the current conversation.

**On reading the SchoolFees Manager project folder**
I don't have that repo's files in this session — no folder was uploaded, and I have no standing filesystem access to your other projects. What I have is the feature list already in memory ([[schoolfees-manager]]), which is what's shaped the fees module all along. If you upload the actual SchoolFees Manager source (or the specific screens/files you want matched exactly — term/section definition, number sequence config, fee structure logic), I can study it directly and match it precisely instead of working from the remembered feature list.

---

## 2. Vue conversion

Confirmed — the static HTML mockups were always meant to be replaced by real Vue components once the visual direction was agreed, not the final artifact. Moving forward: every reusable piece (Toast, Modal, CurrencyInput, StarRating, DataTable, form fields) becomes a real `.vue` single-file component in `client/src/components/base/`, imported everywhere, matching the reuse-first structure already specified in `engineering-design.md` and `platform-addendum.md` §7.

## 3. Modal-first CRUD, tabs over dropdowns

- **Adding a record** (a new fee item, a new subject, a new guardian) opens a modal, not a new route — fewer pages, faster in-context editing, consistent with the Modal component already spec'd. **Editing/viewing a record with real depth** (a student's full profile, a staff member's full profile) stays a dedicated page — a modal isn't the right container for a page-length form. Rule of thumb: if the form fits in a comfortable modal (roughly one screen, no sub-sections), it's a modal; if it has multiple grouped sections or its own sub-navigation, it's a page.
- **Tabs vs. dropdown filters:** tabs when the options are few (2–4) and switching between them is the primary action on the page (e.g. Defaulters / Collections / Per class on the reports screen — already built this way). Dropdowns when the list is long or is a secondary filter alongside other filters (e.g. "filter students by class" sitting next to a search box) — a dropdown doesn't crowd the page the way 10+ tabs would.

## 4. Multiple teachers per class-subject

`subject_teacher_assignments` (already a join table, not a column on `subjects`) already supports this structurally — the schema was never limited to one row per (subject, class, term). What's new: the **allocation UI** needs to actually support adding more than one teacher per row (currently mocked as a single dropdown) — a multi-select or a small "+ add another teacher" affordance per subject/class row, so co-teaching or a substitute-plus-primary-teacher setup is a normal case, not a workaround.

## 5. Star ratings for psychomotor/affective

Replaces the 1–5 dropdown in the mockups with a star-rating component (`<StarRating :max="5" v-model="score" />`) — same underlying `rating_key_id` value, just a friendlier input than a `<select>` for a 1–5 scale. One reusable component, used in both the psychomotor and affective tabs.

## 6. Payment accounts (schools track where money actually went)

New table, extending the fees schema:
```
payment_accounts
  id, school_id, type ('cash'|'bank'), bank_name, account_number, account_name, is_active
```
Every `payments` row gets a `payment_account_id` FK. Settings gets a new screen (Fees → Payment accounts) where a school registers its accounts (e.g. Zenith — 2219098987, Jaiz — 23456784, plus a generic Cash account) — and the collections report (`fees/reports.html`'s "Collections" tab) can then break totals down by account, answering "how much actually landed in which account this term," which the legacy system never tracked at all.

## 7. Role-based dashboards — new module: `dashboards/`

Not one dashboard with different data — genuinely different layouts per role, since a subject teacher and a bursar need to see almost nothing in common:
- **Admin dashboard** — school-wide: enrollment, collections, publish status, staff overview (roughly what's mocked today).
- **Class teacher dashboard** — their class only: attendance to log, comments pending, fee status of their class.
- **Subject teacher dashboard** — their assigned subject/class combos: scores pending entry, quick link into score entry.
- **Accounts/bursar dashboard** — collections, defaulters, payment-account breakdown, reminders to send.
- **Developer/platform dashboard** — see §9, a different tier entirely.

Each is its own Vue view under `dashboards/`, sharing chart/stat-card components but not layout — a bursar shouldn't scroll past a broadsheet-shaped widget they'll never use.

## 8. Attendance — manual and biometric

- **Manual** (already mocked): a class teacher enters days-present/absent per student per term — fine for a termly summary, but coarse.
- **Daily attendance**, worth adding as its own concept rather than folding into the termly remark: a `daily_attendance` table (`student_id, date, status, marked_by_staff_id, source ('manual'|'biometric')`), which a class teacher can mark manually per day, and which a biometric device can also write to via a small ingestion endpoint. The termly `days_present`/`days_absent` in `student_term_remarks` then becomes a **computed rollup** of `daily_attendance` for the term, not a hand-typed number — more accurate, and it's what makes a biometric integration actually useful instead of just a parallel, disconnected system.
- **Biometric integration** itself is hardware-dependent (fingerprint reader brand, whether it pushes to the app or the app polls it) — needs a concrete device chosen before this can be scoped further; the `source` column and a generic ingestion endpoint is the forward-compatible piece that can be built now regardless of which device gets picked later.

## 9. Developer/platform console (new, separate from school admin)

This is a different tier from everything else in the app — not a school's admin, but *your* control plane across every school running EduCore:
- **Developer login** — separate auth path from school staff/admin login, its own role, not part of any school's `users` table.
- **Integration settings** — SMTP credentials, SMS provider key, Paystack keys — configured once per deployment (or per school, if multi-tenant), never hardcoded in source (direct continuation of the credential-handling fix in `engineering-design.md` §3).
- **Module activation** — if fees/results/recruitment/etc. become separately licensable modules, a simple per-school toggle table (`school_modules: school_id, module, is_active`) gates access — relevant if EduCore is ever sold to other schools beyond the pilot, not just used internally.
- **Error/audit log viewer** — surfaces the `audit_log` table (already in the schema) and application error logs in one place, filterable by school/date/severity.
- **Usage/health insights** — active-user counts, request volume, response-time trends over time — the kind of thing that tells you a school's about to hit a wall before they email you about it.

## 10. Report cards — templates, edge cases, and the broadsheet redesign

### 10.1 Multiple report card templates, school-configurable

A `report_templates` table (`school_id, name, is_default, layout_config` — where `layout_config` is a JSON blob of which optional fields are shown and in what order: highest score, class average, position-per-subject, overall term position, cumulative position, etc.), edited via a settings screen with checkboxes for each optional field, drag-to-reorder for their placement (reusing the same drag-to-reorder pattern already built for classes/sections), and a live preview pane — pick one as the school's default, or choose per print run. Every template still renders to A4, since that's a print constraint, not a design choice.

### 10.2 A gallery to view every report card at once

A `results/report-card-gallery.html`-equivalent view: the whole class as a grid of report card thumbnails (or a paginated list), each opening the full card, with a "print all" batch-export — answers "where do I view all reports at once," which today's mockups only show one student at a time.

### 10.3 Broadsheet redesign

Reverting to the fuller version described: landscape orientation (matches how it's actually printed), CA/exam/total as sub-columns under one **merged header cell per subject** (not three separate flat columns), and a set of checkboxes at the top controlling what's visible per print — "Totals only" vs. "Show all" (CA1/CA2/exam/total per subject) — so one broadsheet screen serves both a quick totals-only printout and a full working-copy version, instead of two different reports.

### 10.4 Global search

The topbar search box (already present in every mockup, currently non-functional) becomes a real global search — students by name/admission number, staff by name, and eventually settings pages themselves ("classes" jumps you to Settings → Classes) — a single `search` endpoint that queries across a few key tables and returns typed results grouped by category.

### 10.5 Score-calculation edge cases — the important one

Working through the scenarios raised, in order:

**A student joins mid-session (2nd or 3rd term), or a term is simply missing for them.** Already solved by `plan.md` §2.1's `computeCumulativeAverage` — it averages whichever terms actually have a `student_terms` row, never treats a missing term as a zero.

**A student takes a subject in term 1, drops it, and doesn't pick it up again — the record should remain but not show on the current term's report.** This is a *query ordering* fix, not a schema fix: the report card's subject rows must be derived from **"which subjects does this student have a score for, this term"** — never from a static master subject list, and never from "any subject they've ever taken." Concretely: `SELECT DISTINCT subject_id FROM subject_scores WHERE student_id = ? AND term_id = <current>` defines the rows shown. The dropped subject's term-1 row stays in the database untouched (nothing is deleted), it just doesn't surface unless someone's explicitly looking at term 1's own report card or a trend view. Your instinct to "load the current term's subjects first, then check other terms" is exactly the right order — the current term is the source of truth for *which* subjects appear; prior terms are only consulted afterward, per-subject, for trend/cumulative columns, and skipped (not zeroed) where that specific subject doesn't have a prior-term row.

**A subject swap** (dropped French for Further Maths next term) falls out of the same rule automatically — term 2's report simply won't have a French row, French's term-1 data sits untouched in the table, and Further Maths appears from term 2 onward with no term-1 cumulative data to average against (handled the same as "missing term" above).

**Two edge cases not raised directly, worth flagging because they'll bite eventually:**
- **A class's curriculum changes between terms** — the subject list a class takes this term might differ from what it took last term (a new elective introduced, an old one dropped school-wide, not just per-student). Same fix applies: always derive from actual `subject_scores` rows for the term in question, never from a static "this class takes these N subjects" assumption.
- **Grading scale or subject max-scores change between terms.** If a school updates its grade boundaries (or a subject's CA1 max) mid-year, a report card printed later for an *earlier* term must still show the grade that was correct back then — not get silently recalculated against today's boundaries. Fix: **compute and store the grade (and percentage, if max-scores can change) on the `subject_scores` row at save time**, rather than deriving it live from `grade_boundaries`/`subjects.ca1_max` at render time. This is a small schema addition (`subject_scores.computed_grade`) but a real data-integrity requirement — without it, historical report cards would silently drift if settings change later.

---

## 11. Updated phase list

Extends `milestones.md`:
- Phases 1–5: unchanged.
- **Phase 6 (was "Permissions, Concurrency & Polish"):** unchanged content, plus JWT-based auth (see below) and PWA installability.
- **Phase 7 (new): Dashboards module** — the role-based dashboards in §7.
- **Phase 8 (new): Developer/platform console** — §9, and only relevant once/if EduCore serves more than the pilot school.

## 12. Smaller items, grouped

- **JWT vs. session:** noting a tradeoff honestly before adopting it — `engineering-design.md` originally specified session-cookie auth because it's simpler to secure for a monolith serving its own SPA (no token storage/refresh complexity, easy revocation). JWT is worth it specifically if a mobile app or a third-party API consumer needs to authenticate independently of a browser session — which the PWA/installable-web-app direction in this addendum makes more likely. Recommend: JWT (short-lived access token + refresh token, `httpOnly` cookie for the refresh token so it's not exposed to JS) rather than session cookies, given the mobile direction — updating `engineering-design.md` §3 to reflect this.
- **Installable web app (PWA):** a web app manifest + service worker (cache-first for static assets, network-first for data) makes "Add to home screen" available on both Android and iOS — straightforward addition, doesn't change the architecture.
- **Extensible student/staff records:** the core fields already designed (name, DOB, admission info, etc.) stay fixed and admin-entered. On top of that, a `custom_fields` table (`school_id, applies_to ('student'|'staff'), field_name, field_type`) plus a `custom_field_values` table lets a school define extra fields (e.g. "blood group," "next of kin"), and — per the request — the *student or staff member themselves* can fill in or update those additional values through their own portal login, without needing admin involvement for every small detail.
- **Auto-filled/default settings values:** every settings screen with a sensible default (grading scale bands, psychomotor/affective legend, notification templates, the teacher/principal comment-draft templates from `platform-addendum.md` §4) ships pre-filled with reasonable Nigerian-school-standard defaults on a fresh school setup, editable immediately — not blank forms waiting to be filled from scratch.
- **Bulk email/SMS, term-end reports:** the notification settings already planned (`plan.md` §3's `notification_settings`) gets a bulk-send mode (whole class/whole school, not just one defaulter at a time) and a scheduled/triggered send for full-term and mid-term (CA1) report distribution — sending the actual report PDF or a results-ready notice, not just a balance reminder.
- **Mobile table visibility:** confirmed as a real gap in the current mockups — the fix, already the pattern used in `results/broadsheet.html`, needs to be applied consistently everywhere a table currently just overflows or hides columns on small screens: either a card-view fallback (broadsheet's existing pattern) or a horizontally-scrollable table with a **sticky first column** for score-entry specifically (name stays fixed, CA1/CA2/exam scroll) — the sticky-column approach is the right one for score entry specifically since the row identity (which student) needs to stay visible while scrolling through the score fields, which a full card-per-student layout would make slower for rapid entry.
