# EduCore — Platform Addendum (v3)

Extends `engineering-design.md`. Everything here was asked for directly, plus a closing section answering "what haven't we covered yet."

---

## 1. Reusable client + server validation (one schema, not two)

The legacy system validates almost nothing server-side — client-side checks only, which is exactly how the SQL-injection and dynamic-`$field` issues in `engineering-design.md` §3 stay exploitable even if a developer adds a client-side check later. The fix isn't "add server validation too" as a separate task — it's **one schema, shared**:

- Every form's validation rules are written once as a `zod` schema in a shared package (e.g. `packages/shared/schemas/student.schema.ts`), imported by **both** the Vue form (via `vee-validate`'s zod resolver) and the Express route handler.
- A student's admission-year range, a score's max value (pulled from Phase 1's per-subject config), an email format — defined once, enforced identically on both sides, so there's no way for the two to drift out of sync the way client-only validation eventually does.
- The server-side check is never skipped "because the client already checked" — it's the actual security boundary; the client-side copy is purely for instant feedback (per the on-blur validation UX already specified in `ux-design.md` §3.3).
- Since the frontend and backend are one monolithic repo already (`plan.md` §3), this is a workspace-local shared folder, not a published package — no extra publishing/versioning overhead.

## 2. Currency input — reusable, auto-formatting

Recommend `vue-currency-input`: it's built on the native `Intl.NumberFormat` API rather than a hand-rolled formatter, has zero dependencies, and formats as the user types (thousand separators appear live, not just on blur) — a small but real detail for fee amounts specifically, where a bursar needs to see `₦150,000` forming correctly while typing, not after. Wrapped once as `<CurrencyInput>` in the base component set (`engineering-design.md` §5) and reused everywhere money is entered — fee structure amounts, adjustments, payments — so there's exactly one currency-formatting behavior in the whole app, not a slightly different one per screen the way the legacy forms vary.

## 3. Exports — PDF, Excel, and more

Every report-shaped screen (broadsheet, report card, defaulters list, collections report) gets the same two export buttons, not export logic re-implemented per report:
- **PDF** — `puppeteer` rendering the same HTML/CSS template used for the on-screen preview (so the PDF and the screen never visually drift apart), used for report cards, receipts, and broadsheets specifically since those need to look like a real printed document.
- **Excel** — `exceljs`, used for anything a bursar or admin would want to filter/sort/pivot further outside the app (defaulters list, collections report, class lists) — successor to the legacy's bundled PHPExcel, same underlying idea, actively maintained library.
- **CSV**, as a lighter byproduct of the same Excel export path, for anything going into a third-party tool.

## 4. Auto-suggested (not automated) principal/teacher comments

"Automate ... based on performance" is worth being precise about: the rebuild does **not** silently generate and save a comment without a human choosing it — a report card comment is a real message to a parent, and auto-writing it unreviewed would be a worse experience than the legacy's blank-text-box status quo. What it does instead:
- A small `comment_templates` table (school-configurable, seeded with reasonable defaults) maps score/grade bands to draft comment text — e.g. a student averaging in the "A" band surfaces a draft like "Excellent performance this term, keep it up," a student in a failing band surfaces something like "Needs more effort in the coming term, please provide extra support at home."
- On the score-entry/comment screen, the teacher's comment field **pre-fills** with the matched draft based on that student's computed average, editable before saving — one click to accept, or edit freely. Same mechanism for the principal's comment field, with the principal able to configure their own draft set independent of the teacher's.
- This cuts the actual repetitive-typing burden (writing thirty near-identical "well done" comments a term) without removing the teacher's/principal's judgment on any individual student — the save action is always a human's, never the system's.

## 5. Fine-grained permission overrides (beyond generic RBAC)

The base `users.role` enum (admin/principal/class_teacher/subject_teacher/bursar) from `plan.md` covers the common case, but a real school eventually needs an exception — a bursar who should also see the broadsheet, a class teacher covering for another class this term. Recommend **CASL** (`@casl/ability`) layered on top of the role enum rather than expanding the enum indefinitely:
- CASL is isomorphic — the same ability definitions can run on the Express backend (as the real authorization check) and on the Vue frontend (to hide/show UI affordances), so there's one permission model, not a backend check and a separately-maintained frontend "what buttons to show" list that can drift apart.
- Base permissions come from the role, exactly as `engineering-design.md` §3 already specifies. On top of that, a `permission_overrides` table (`user_id, subject, action, effect ('allow'|'deny')`) lets an admin grant or revoke one specific capability for one specific user, without touching the role system at all.
- **UI, not a form.** The request was explicit that this needs to be usable "without reading clear instructions, not a few click" (i.e., not a form buried behind several unclear steps) — the settings screen for this is a simple matrix: users down the side, modules/actions across the top, a toggle per cell, defaulting to whatever the role already grants and visually distinct when an admin has overridden it. An admin looking at the grid should immediately see both "what this role can normally do" and "what's been specifically changed for this person," in one view.

## 6. Failed email/SMS log + resend

A `notification_log` table (extends `notification_settings` from `plan.md` §3): every outbound email/SMS gets a row — recipient, channel, message, status (`sent`/`failed`/`pending`), the provider's error response on failure, timestamp. The notifications settings screen (Phase 5) includes a log view filtered to `failed`, with a **Resend** action per row (and a bulk "resend all failed" action) — rather than the legacy's fire-and-forget `sms.php`, which has no record of whether a message actually reached anyone.

## 7. Clean, module-based file structure

```
educore/
├── server/
│   ├── modules/
│   │   ├── students/
│   │   │   ├── students.routes.js
│   │   │   ├── students.controller.js
│   │   │   ├── students.service.js
│   │   │   └── students.repository.js
│   │   ├── staff/            (same 4-file shape)
│   │   ├── fees/             (same shape)
│   │   ├── results/          (same shape)
│   │   ├── settings/         (same shape)
│   │   ├── notifications/    (same shape)
│   │   ├── recruitment/      (same shape — §8 below)
│   │   └── auth/
│   ├── helpers/                # global, cross-module helpers — the piece the legacy has none of
│   │   ├── currency.js          # formatting/parsing shared with the frontend's CurrencyInput
│   │   ├── numberSequence.js    # the D365-style sequence generator from plan.md §6
│   │   ├── ranking.js           # the computeCumulativeAverage function from plan.md §2.1
│   │   └── exportPdf.js / exportExcel.js
│   ├── middleware/               # auth, RBAC/CASL, error handler, request logging
│   └── db/migrations/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── base/            # Toast, Modal, CurrencyInput, etc. — engineering-design.md §4
│   │   │   └── <domain>/         # feature-specific components, mirrors server/modules/ names
│   │   ├── views/                # one folder per module, same naming as server/modules/
│   │   ├── stores/                # one Pinia store per domain
│   │   └── composables/           # useToast, useCurrency, etc.
├── packages/shared/
│   └── schemas/                    # the zod schemas from §1 — imported by both server/ and client/
└── README.md
```

Every module — server and client — uses the **same name** for the same domain (`fees`, `results`, `students`...), so jumping from a frontend view to its backend route is "same folder name, different top-level directory," not a naming puzzle. The `helpers/` folder is specifically for the cross-cutting logic that the legacy system duplicates per-file instead (ranking math, number sequences, currency formatting) — one home for "logic more than one module needs," so it's never copy-pasted a second time the way the legacy's ranking SQL was copy-pasted four times.

## 8. Job application / recruitment module

A lightweight ATS, scoped to what a school actually needs rather than a full enterprise recruitment suite:

```
job_postings
  id, school_id, title, description, department, status ('open'|'closed'), posted_at

applicants
  id, job_posting_id, name, email, phone, resume_url, cover_note

application_stages                                    -- pipeline: applied → screening → interview → offer → hired/rejected
  id, applicant_id, stage, moved_at, moved_by_staff_id, notes

interview_schedule
  id, applicant_id, scheduled_at, interviewer_staff_id, location_or_link, outcome_notes
```

- Admin posts a role, applicants apply (a simple public form — name, email, phone, resume upload, cover note), admin moves them through the pipeline stages with notes at each step, schedules interviews against a staff member.
- **Hire-to-staff-record shortcut:** moving an applicant to "hired" offers a one-click "create staff profile from this applicant" action, pre-filling the new `staff` record's name/email/phone from the application — closes the loop between recruitment and the staff module from Phase 1 instead of leaving them disconnected.

---

## 9. What we haven't covered yet — multi-user concurrency

Directly answering "what's important that we haven't taken care of": this system will have several people editing overlapping data at the same time in normal daily use (two bursars posting payments, a subject teacher and the class teacher both on a student's record during report-card season) — the legacy system, being simple form-submit-per-page PHP, never had to think about this, but a modern app should:

- **Optimistic concurrency control.** Every editable table gets an `updated_at` (or a numeric `version`) column; an update request includes the version it was loaded from, and the server rejects (409, not a silent overwrite) if it doesn't match — the classic "last write wins destroys someone's edit" problem the legacy has no protection against at all.
- **Live-edit awareness**, for the highest-contention screens specifically (score entry during report-card season): a lightweight WebSocket (or Server-Sent Events, simpler if only one-directional updates are needed) channel that shows "Mrs. Adeyemi is currently editing this student's scores" — not full real-time collaborative editing, just enough to stop two people from silently clobbering each other's work.
- **Connection pooling** on the MySQL connection (Knex handles this natively) sized for the realistic concurrent-user count, not the legacy's per-request `mysqli_connect` pattern.
- **Session store** needs to be shared (Redis, or a DB-backed session table) rather than in-process memory the moment the app runs on more than one server process/instance — worth deciding alongside the hosting question already open in `plan.md` §10, since a single cPanel Node process may not need this on day one but shouldn't be architected in a way that makes adding it later painful.
- **Rate limiting per user**, not just per IP, on write-heavy endpoints (payment posting, score entry) — protects against both abuse and against one runaway client-side bug hammering the API.

None of this needs to be over-built for a single pilot school on day one, but the schema/API decisions above (versioned rows, a shared session store, pooled connections) are the ones that are much cheaper to build in from the start than to retrofit once real concurrent usage is already happening.

---

## 10. On the SchoolFees Manager question

I have SchoolFees Manager's **feature list** from memory — dynamic billing engine, configurable registration-number formats, carry-forward, Insights Dashboard, Opening Balances import, the scrypt-based security audit — and that's what's informed the fees-module design in `plan.md` throughout. What I don't have stored is the actual **visual/Tailwind implementation** (exact spacing, component structure, color usage in the real code) — memory keeps facts you've told me, not a copy of the codebase. If you want EduCore's Tailwind styling to match SchoolFees Manager exactly rather than just following the brand-token system in `ux-design.md`, sharing the actual component files (or the repo) would let me match it precisely instead of working from the token system alone.
