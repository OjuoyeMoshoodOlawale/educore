# AnySchool — Product & Technical Design Document

**Author:** WebAutomate Nigeria
**Stack target:** Vue 3 (frontend) + Express (backend) — monolithic web repo
**Source material reviewed:** legacy `portal.islamicity.com.ng` PHP/MySQL school portal, and the existing `schoolfees-manager` (Electron/React/SQLite) product

---

## 1. Product Vision

AnySchool is a web-based, browser-accessible school management platform, built to replace ad-hoc PHP school portals (like the islamicity.com.ng legacy system) with one modern, reusable product any school can be onboarded onto — hence "Any School." The first release focuses on making the **school fees module** fully feature-complete, since that is the highest-value module both in the legacy portal and in the existing desktop `schoolfees-manager` product. Immediately after fees, the **report card module** — teacher score input, psychomotor/affective ratings, attendance, teacher's and principal's comments (section 9) — is the second build priority. Broader academic records (promotion, multi-term broadsheets) are modeled in the schema so it doesn't need reshaping later, but are a later release.

Unlike `schoolfees-manager` (single-school, offline-first, Electron desktop app), AnySchool is multi-user over the network by default — closer to the legacy PHP portal's deployment model, but rebuilt cleanly.

---

## 2. Brand & Design System (Vue 3)

Reuse the existing WebAutomate Nigeria brand system (logo, color system, motion branding, brand guide) as the parent brand; AnySchool gets its own product mark that sits under it, the same way `schoolfees-manager` and `NovaPOS` do.

**Design tokens** (CSS custom properties, consumed by Vue 3 components — no Bootstrap/jQuery/sb-admin-2 template like the legacy portal):

| Token | Value | Use |
|---|---|---|
| `--as-primary` | deep indigo `#1E3A5F` | headers, primary buttons, sidebar |
| `--as-accent` | warm gold `#D4A017` | CTAs, highlighted balances/arrears |
| `--as-success` | green `#2E7D32` | paid/settled states |
| `--as-danger` | red `#C62828` | arrears/overdue states |
| `--as-neutral-50…900` | gray scale | surfaces, text, borders |
| `--as-font` | Inter / system-ui | all UI text |
| `--as-radius` | 8px | cards, inputs, buttons |
| `--as-space` | 4px base scale (4/8/12/16/24/32) | layout spacing |

**Component approach:** Vue 3 `<script setup>` SFCs, Tailwind utility classes mapped to the tokens above (no compiled config needed beyond `tailwind.config` extending `theme.colors` from the token table), Pinia for state, vue-router for navigation. No jQuery, no page-reload-driven CRUD (a hard break from the legacy portal, which reloads the full page for every edit).

**Key UI surfaces to design first:**
- Dashboard (collections this term, outstanding arrears, defaulter count) — replaces the legacy "Insights Dashboard" concept from `schoolfees-manager`
- Fee structure builder (per class / session / term / gender / intake / student-type)
- Student fee ledger (current term breakdown + adjustments + running balance, mirrors `data_query.php`'s logic but rendered as a live Vue view instead of server-rendered HTML table)
- Payment recording drawer
- Bulk SMS/defaulter reminder screen

---

## 3. System Architecture

**Monolithic repo**, one Express app serving both the JSON API and the built Vue 3 SPA (`vite build` output served as static files by Express in production; Vite dev server proxies `/api` to Express in development).

```
anyschool/
├── server/
│   ├── index.js                # Express bootstrap
│   ├── config/                 # env, db pool
│   ├── middleware/              # auth, error handler, request logging
│   ├── modules/
│   │   ├── auth/
│   │   ├── schools/             # school profile, session/term, classes
│   │   ├── students/
│   │   ├── staff/
│   │   ├── fees/                 # ★ primary module this release
│   │   │   ├── fees.routes.js
│   │   │   ├── fees.controller.js
│   │   │   ├── fees.service.js
│   │   │   └── fees.repository.js
│   │   ├── payments/
│   │   ├── notifications/        # SMS (Termii) + email (Nodemailer), reuse from schoolfees-manager/Hope Nurse patterns
│   │   └── results/               # modeled, not built out yet
│   └── db/
│       ├── migrations/           # knex or Prisma migrations
│       └── seeds/
├── client/                       # Vue 3 SPA (Vite)
│   ├── src/
│   │   ├── views/
│   │   ├── components/
│   │   ├── stores/                # Pinia
│   │   ├── design-tokens/          # CSS vars from section 2
│   │   └── router/
├── package.json                   # single root, workspaces for client/server, or two package.json with a root build script
└── README.md
```

**Auth:** session-based (httpOnly cookie) is the simplest fit for a monolith serving its own SPA — avoids the token-storage complexity of JWT-in-localStorage. Password hashing reuses the scrypt + timing-safe comparison approach already implemented in `schoolfees-manager`.

**Multi-tenancy:** start single-school-per-deployment (matches the legacy portal's `schprofile` singleton row and the `schoolfees-manager` model), but design the schema (section 4) with a `school_id` foreign key on every table from day one, so a later move to one deployment serving many schools is a data-migration, not a rewrite.

**Database:** MySQL (`mysql2` driver), since the legacy system and Hope Nurse work are both MySQL-based and that's the operating environment this will run in on shared/cPanel-style Nigerian hosting.

---

## 4. Database Schema — Fees-First Design

The legacy portal's fee logic works but has real problems worth fixing in the redesign: string-concatenated SQL (SQL-injection risk throughout `editschoolbillitems.php`, `data_query.php`, etc.), no foreign keys, amounts as loosely-typed columns, and fee eligibility encoded as repeated `OR`/`'All'` string matching in every query instead of a join table.

**Core tables:**

```
schools
  id, name, motto, address, email, phone, website, logo_url,
  student_no_prefix, staff_no_prefix, created_at

sessions          -- e.g. "2025/2026"
  id, school_id, name, is_active

terms             -- e.g. "First Term"
  id, session_id, name, opens_on, closes_on, holiday_count, is_active

classes
  id, school_id, name, ranking          -- ranking replaces legacy classranking for ordering/promotion

students
  id, school_id, admission_no, first_name, last_name, other_name,
  gender, date_of_birth, parent_phone, parent_email, boarding_type,   -- boarding_type replaces legacy 'type'/'new'/'intake'
  created_at

student_terms      -- replaces legacy studentstatus: which class/term a student is enrolled in
  id, student_id, term_id, class_id, status ('active'|'inactive'|'graduated'|'withdrawn')

staff
  id, school_id, staff_no, first_name, last_name, role, phone, email,
  password_hash, is_active

fee_items          -- replaces legacy SchoolBillItems
  id, school_id, name

fee_structures      -- replaces legacy schoolbill; eligibility as real columns, not string OR-matching
  id, school_id, fee_item_id, class_id, session_id, term_id,
  amount, applies_to_gender ('all'|'male'|'female'),
  applies_to_intake ('all'|'new'|'returning'),
  applies_to_boarding_type ('all'|'day'|'boarder')

fee_adjustments     -- replaces legacy schoolbilladjustment; per-student scholarships/discounts/extra charges
  id, student_id, session_id, term_id, description, amount, created_by_staff_id

payments            -- replaces legacy paymenthistory
  id, student_id, session_id, term_id, amount, method ('cash'|'bank'|'transfer'|'card'),
  reference, payee_name, received_by_staff_id, paid_at, receipt_id

receipts
  id, payment_id, receipt_no, pdf_url, sent_via ('email'|'sms'|null), sent_at

sms_log
  id, school_id, recipient_phone, message, status, sent_at

audit_log            -- new: legacy portal has no audit trail on financial edits at all
  id, staff_id, action, table_name, record_id, before, after, created_at
```

**Balance calculation** (replaces the nested-subquery SQL in `data_query.php`/`studentpersonaldetails.php`) becomes a service function:
`current_term_charges = Σ fee_structures matching student's class/term/gender/intake/boarding_type + Σ fee_adjustments for that term`
`opening_balance = Σ all prior charges − Σ all prior payments` (carried forward, same concept as the "carry-forward" feature already shipped in `schoolfees-manager`, just computed via joins instead of the legacy portal's chain of correlated subqueries)

---

## 5. School Fees Module — Complete Feature List

Combining what the legacy portal has, what `schoolfees-manager` already added, and gaps in both:

**Fee structure & setup**
- Configurable fee items (tuition, boarding, transport, etc.)
- Per-class, per-term, per-session fee amounts
- Eligibility rules: gender, new/returning intake, day/boarder — as structured fields, not string matching
- Bulk copy of a fee structure from one term/session to the next

**Per-student adjustments**
- Scholarships, discounts, extra one-off charges
- Full history of adjustments per student per term

**Billing & balances**
- Auto-computed current-term balance from fee structure + adjustments
- Carried-forward balance from all prior terms (opening balances import, from `schoolfees-manager`)
- Total balance (current + carried forward)

**Payments**
- Record payments by cash / bank / transfer / card (Paystack integration path, matching patterns already used in `The Native Narrative` and `The Platform / MYS`)
- Partial payment support
- Payment history per student, per term, per session

**Receipts & communication**
- PDF receipt generation per payment
- Email receipts (Nodemailer, as already used on Hope Nurse/`schoolfees-manager`)
- SMS receipts and defaulter reminders (Termii — replacing the legacy portal's eBulkSMS integration, whose API key was hardcoded directly in `sms.php`)

**Reporting**
- Insights dashboard: total expected vs. collected, per class/term
- Defaulters/arrears report, exportable
- Collections report by payment method, by staff member who received it
- Per-class fee report

**Admin & governance**
- Role-based access (admin vs. bursar/accounts staff vs. read-only)
- Full audit log on every fee/payment edit or delete (the legacy portal has none — `deleteschoolbillitems.php` deletes with no trace)
- Multi-user, concurrent access by design (the legacy portal's LAN-networking retrofit becomes unnecessary since this is web-native from the start)

---

## 6. API Overview (fees module)

```
GET    /api/fees/structures?sessionId=&termId=&classId=
POST   /api/fees/structures
PUT    /api/fees/structures/:id
DELETE /api/fees/structures/:id

GET    /api/students/:id/ledger?sessionId=&termId=
POST   /api/students/:id/adjustments
DELETE /api/adjustments/:id

POST   /api/payments
GET    /api/payments?studentId=&sessionId=&termId=
GET    /api/payments/:id/receipt         # PDF

GET    /api/reports/defaulters?sessionId=&termId=&classId=
GET    /api/reports/collections?from=&to=

POST   /api/notifications/sms            # bulk defaulter reminders
```

All list/report endpoints take `sessionId`/`termId` as explicit query params instead of the legacy portal's reliance on `$_SESSION['activesession']`/`$_SESSION['activeterm']` globals — makes the API stateless and testable.

---

## 7. Security Improvements Over the Legacy Portal

The legacy code has several patterns this design deliberately breaks from:
- **SQL injection:** every legacy query builds SQL via string concatenation of `$_POST`/`$_GET` values directly (`editschoolbillitems.php`, `deleteschoolbillitems.php`, `data_query.php`, `updateresult.php`, `editotherkey.php`, etc.). AnySchool uses parameterized queries exclusively (via Knex/Prisma or `mysql2` prepared statements) — no raw string interpolation into SQL, anywhere.
- **Secrets in source:** the legacy `sms.php` has an SMS API key hardcoded and rendered straight into a visible HTML input field. AnySchool keeps all provider credentials in environment variables, never rendered to the client.
- **No CSRF protection** on legacy POST forms. AnySchool adds CSRF tokens on state-changing requests.
- **`error_reporting(0)`** everywhere in the legacy code hides failures from the developer as much as the user. AnySchool uses structured server-side logging instead.
- **No audit trail** on deletes/edits of financial records — added in section 4/5 above.

---

## 8. Migration Plan from the Legacy Portal

1. Export legacy MySQL tables (`studentprofile`, `studentstatus`, `schoolbill`, `schoolbillitems`, `schoolbilladjustment`, `paymenthistory`, `session_term`, `classlist`, `schprofile`) via `mysqldump`.
2. Write one-time transform scripts (Node, using the same `mysql2` driver) mapping legacy columns to the new schema in section 4 — this is where `studentstatus.new`/`type` collapse into `students.boarding_type`, and `schoolbill`'s string-matched eligibility columns become the structured `fee_structures` columns.
3. Validate migrated balances against the legacy portal's computed balances for a sample of students per class, before cutover.
4. Run both systems in parallel for one term if possible, reconciling collections reports.

---

## 9. Report Card & Teacher Score Input Module (Build Priority #2, after Fees)

The legacy portal spreads this across `updateresult.php` (per-cell subject scores via AJAX), `psychomotorm.php` (psychomotor trait list), `editgradem.php`/`gradelist` (grade boundaries), `editotherkey.php`/`otherratingkey` (an additional rating key, likely used for psychomotor/affective ratings), `updatecomment_att.php`/`comment_att` (a dynamic-column table storing attendance + comments), and a referenced-but-missing `affective.php` broadsheet view. AnySchool consolidates this into one coherent report-card domain, with the same "no dynamic/arbitrary column names built from request input" fix applied here as in the fees module (the legacy `updatecomment_att.php`/`updateresult.php` both take a raw `$field` name straight from `$_POST` and interpolate it into `UPDATE ... SET $field=...` — real SQL-injection surface).

**Scope for this pass:** teacher score input, psychomotor rating, affective rating, attendance, teacher's comment, principal's comment — the inputs a class/subject teacher and the principal fill in each term, culminating in a printable report card.

### 9.1 Database Schema

```
subjects
  id, school_id, name, code

grade_boundaries          -- replaces legacy gradelist
  id, school_id, min_score, max_score, grade_key, description   -- e.g. 70-100, 'A', 'Excellent'

rating_keys                -- replaces legacy otherratingkey
  id, school_id, key, description                                -- e.g. '5','Excellent'; used for psychomotor/affective scales

psychomotor_traits          -- replaces legacy psychomotorlist
  id, school_id, description                                     -- e.g. 'Handwriting', 'Sports', 'Handling of tools'

affective_traits
  id, school_id, description                                     -- e.g. 'Punctuality', 'Honesty', 'Neatness'

subject_scores              -- replaces legacy result table
  id, student_id, term_id, subject_id,
  ca1, ca2, exam, total,                                          -- total computed server-side, not trusted from client
  grade_boundary_id,
  entered_by_staff_id, updated_at

psychomotor_scores
  id, student_id, term_id, psychomotor_trait_id, rating_key_id

affective_scores
  id, student_id, term_id, affective_trait_id, rating_key_id

student_term_remarks         -- replaces legacy comment_att's dynamic-column pattern with real, fixed columns
  id, student_id, term_id,
  days_present, days_absent, times_school_opened,                -- attendance, as real numeric fields, not one string
  teacher_comment, teacher_id, teacher_commented_at,
  principal_comment, principal_commented_at
```

`student_term_remarks` is the direct fix for `comment_att`: the legacy table stores attendance and both comments as ad-hoc columns added via whatever `$field` name a request happened to send, with no schema guarantee they exist. Here they're first-class typed columns.

### 9.2 Feature List

**Teacher score input**
- Subject teacher enters CA1 / CA2 / exam per student per subject per term (mirrors the legacy inline-edit-and-AJAX-save UX in `updateresult.php`, rebuilt as a Vue grid component instead of raw jQuery cell listeners)
- Total and grade computed server-side from `grade_boundaries` on save — never trust a client-submitted total
- Bulk entry view: one subject × one class × one term, all students in a spreadsheet-like grid

**Psychomotor & affective domains**
- School-configurable trait lists (`psychomotor_traits`, `affective_traits`) — same idea as legacy `psychomotorlist`, but with an equivalent affective list (legacy only had psychomotor + a generic "other rating key", so affective traits are new here)
- Class teacher rates each student per trait using the school's configured rating scale (`rating_keys`)

**Attendance**
- Days present / days absent / number of times school opened this term, entered once per student per term (replaces the free-form attendance handling implied by `comment_att`)

**Comments**
- Teacher's comment: free text, tied to the class teacher, one per student per term
- Principal's comment: free text, separate field/role, one per student per term
- Both timestamped and attributed to the staff member who entered them (audit trail — the legacy version has none)

**Report card output**
- Per-student printable report card: subject scores + grades, psychomotor ratings, affective ratings, attendance, teacher's comment, principal's comment, school branding (logo/motto from `schools`)
- Broadsheet/class view: all students × all subjects for a class/term (the legacy portal's unfinished "Class Teacher Broadsheet" in `back up alternative.php`)
- PDF export, matching the receipt-PDF approach already planned for the fees module

**Access control**
- Subject teachers can only enter scores for their assigned subject/class
- Class teachers own attendance + teacher's comment for their class
- Principal role owns the principal's comment field only
- A "publish" step (mirroring the legacy portal's separate `publish.php`) gates when report cards become visible to parents/students — nothing is student-visible until published

### 9.3 API Overview

```
GET    /api/results/scores?classId=&subjectId=&termId=
PUT    /api/results/scores/:studentId              # {ca1, ca2, exam} — total/grade computed server-side

GET    /api/results/psychomotor?classId=&termId=
PUT    /api/results/psychomotor/:studentId

GET    /api/results/affective?classId=&termId=
PUT    /api/results/affective/:studentId

GET    /api/results/remarks?classId=&termId=
PUT    /api/results/remarks/:studentId              # attendance + teacher_comment (class teacher role)
PUT    /api/results/remarks/:studentId/principal     # principal_comment (principal role only)

GET    /api/results/report-card/:studentId?termId=   # PDF
GET    /api/results/broadsheet?classId=&termId=

POST   /api/results/publish                          # {termId, classId} — gates student/parent visibility
```

---

## 10. Next Steps

- Confirm hosting target (cPanel shared hosting, same as Hope Nurse, vs. a VPS) — this affects whether Node process management needs PM2/cPanel Node app manager, given the CloudLinux LVE memory-limit issue already hit on Hope Nurse's Node deployment.
- Decide ORM/query builder: Knex (lighter, closer to raw SQL, easier to reason about the migration in section 8) vs. Prisma (stronger typing, heavier setup).
- Confirm whether Paystack or a bank-transfer-only flow is the priority payment method for v1.
- Confirm the grading scale and psychomotor/affective trait lists for the pilot school so `grade_boundaries`/`rating_keys` can be seeded correctly.
- Once this doc is approved, scaffold the repo structure in section 3 and start with `fees` + `payments` end-to-end, then `results` (score input → psychomotor/affective → attendance/comments → report card render), before broader academic features (promotion, subject broadsheets across terms).
