# EduCore — Milestone Delivery Plan

Each phase below is independently deployable — the pilot school can go live on Phase 1 alone and keep using the legacy portal for everything else, then cut over module by module. This is the concrete schedule for the build sequence already outlined in `plan.md` §9 and `product-manager-design.md` §4.

---

## Phase 1 — Settings foundation + Staff + Allocation
**Deployable outcome:** an admin can fully configure the school (profile, calendar, classes/sections with drag-reorder, subjects, grading scale, number sequences) and manage staff + class/subject-teacher allocation. No student-facing or financial features yet — this phase exists so every later phase has real configuration to build against instead of placeholder data.
- School profile, academic calendar, geo data
- Classes/sections/subjects (incl. drag-to-reorder, per-subject max scores)
- Grading & rating scales
- Number sequences (admission no./staff no./receipt no.)
- Staff CRUD (profile, photo, signature)
- Class-teacher and subject-teacher allocation
- Sign-in (staff/admin roles), base RBAC

## Phase 2 — Students + Fees
**Deployable outcome:** the school can fully run fee collection on the new system — this alone replaces the highest-friction part of the legacy system.
- Student CRUD (using Phase 1's number sequences for admission numbers)
- Fee structure setup, adjustments, payments, receipts (PDF), carry-forward balances
- Reports: defaulters, collections, per-class — exportable to PDF and Excel (§ below)
- Failed-payment-receipt email/SMS log with resend (ties into Phase 5's notification system, but the log itself starts here since payments are the first place it's needed)

## Phase 3 — Results & Report Cards
**Deployable outcome:** teachers can enter scores, and the school can produce and publish report cards and broadsheets per class.
- Score entry (validated against Phase 1's configured max scores)
- Psychomotor/affective rating entry
- Attendance + teacher's/principal's comments, with auto-suggested comment drafts (§ below)
- Report card rendering (with printed signatures) + broadsheet, both PDF and Excel export
- Per-class publish

## Phase 4 — Promotion, Graduation, Result Access
**Deployable outcome:** the school can run a full term-end cycle: promote or graduate students, and parents/guardians can check results.
- Promotion (append-only, idempotent) and graduation (terminal) flows
- One-field admission-number result check, with explicit block/unblock (`is_result_blocked`)
- Logged-in parent/student portal (fees + published results together)

## Phase 5 — Notifications & Recruitment
**Deployable outcome:** communication is fully self-serve from settings, and staff hiring has a real workflow instead of happening outside the system.
- SMS/email provider settings (`notification_settings`)
- Bulk defaulter reminders, publish-notification alerts
- Failed-delivery log + resend, generalized across all notification types (not just payments from Phase 2)
- Job application / recruitment module (§ below): postings → applicants → interview stages → hire-to-staff-record

## Phase 6 — Permissions, Concurrency & Polish
**Deployable outcome:** the system holds up under real multi-user load and gives admins fine-grained control without needing developer involvement.
- Custom per-module permission overrides on top of the base RBAC roles
- Concurrency handling (optimistic locking, live-edit indicators) — see the addendum doc for detail
- Timetable module (net-new, per `plan.md` §5 — the legacy version was never actually built)
- ID cards, anything else in the "could have" tier from `product-manager-design.md` §4

---

## Notes on sequencing

- Phase 1 before Phase 2 is a hard dependency — fees can't be configured against classes/subjects that don't exist yet.
- Phase 5's recruitment module has no dependency on Phases 2–4 and could in principle move earlier if hiring needs come up before results/promotion are finished — flagged as a phase that can be reordered without breaking anything else.
- Every phase ships its own tests per `test-design.md` — "deployable" here means tested and usable standalone, not just code-complete.
