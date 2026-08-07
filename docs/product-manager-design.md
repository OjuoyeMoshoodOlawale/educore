# EduCore — Product Manager Design

Companion to `plan.md` (technical architecture) — this doc is the product framing: who this is for, what they need to be able to do, what ships first, and what could go wrong.

---

## 1. Problem statement

Schools like the pilot (Al-Minhaaj Model College, running on the `portal.islamicity.com.ng` legacy system) are on a PHP portal that works but has accumulated real problems: five overlapping report-card implementations, no settings home (a dozen unrelated config screens), SQL-injection exposure throughout, hardcoded credentials in source, and features that only half-exist (a `timetable.php` with no database behind it). EduCore isn't a from-scratch idea — it's what that system should have become, rebuilt clean, with the features that were half-built actually finished.

---

## 2. Personas

| Persona | What they need from the system |
|---|---|
| **School admin / proprietor** | Full settings control, staff/student oversight, fee configuration, reports across the whole school |
| **Bursar / accounts staff** | Fee structure setup, payment recording, arrears reporting — should not need class/subject/staff-settings access |
| **Principal** | Approve/publish results per class, write the principal's comment on report cards, school-wide dashboard visibility, no need for fee-entry access |
| **Class teacher** | Owns attendance + teacher's comment for their class, sees their class's broadsheet, may also be a subject teacher |
| **Subject teacher** | Score entry (CA1/CA2/exam) for their assigned subject/class only — the narrowest access in the system |
| **Parent/guardian** | Check fee balance and published report card for their child(ren); either via a logged-in portal or the scratch-card-style admission-no. + serial-no. checker, depending on what they have to hand |
| **Student** (older/secondary level) | May have their own login to check published results, narrower than the parent view (no fee balance) |

---

## 3. User stories by module

**Settings (build first — everything else depends on it)**
- As an admin, I can set up the school profile, academic calendar, and grading scale once, before anything else is usable.
- As an admin, I can reorder classes/sections by dragging them, without typing ranking numbers.
- As an admin, I can configure each subject's max obtainable scores (CA1/CA2/exam) instead of assuming a fixed split.

**Staff & allocation**
- As an admin, I can create a staff profile with photo and signature (used later on the printed report card).
- As an admin, I can assign a class teacher and, separately, a subject teacher per (subject, class), per term.

**Fees**
- As a bursar, I can set up a fee structure per class/term with eligibility rules (gender/intake/boarding type), record a payment, and see a student's running balance including carry-forward.
- As a parent, I can see my child's fee balance without needing to visit the school office to ask.

**Results**
- As a subject teacher, I can enter CA1/CA2/exam for my assigned subject/class, validated against that subject's configured max scores.
- As a class teacher, I can enter attendance and my comment for each student in my class.
- As a principal, I can write my comment and publish results **per class** (not forced to publish the whole school at once).
- As a parent, I can view my child's published report card, with a printed signature from the class teacher and principal — not a blank line waiting for a pen.

**Communication**
- As an admin, I can configure the SMS/email provider once in settings, not hardcoded in a file I'd need a developer to edit.
- As a bursar, I can send a bulk defaulter reminder to parents with outstanding fees.

---

## 4. MVP scope (MoSCoW)

**Must have (v1 launch):**
- Settings foundation (school profile, calendar, classes/subjects/sections with drag-reorder, grading scale)
- Staff & allocation
- Fees module, end to end
- Results core (score entry, psychomotor/affective, attendance/comments, report card + broadsheet, per-class publish)
- Promotion + graduation
- Sign-in for staff/admin roles

**Should have (fast-follow, same release cycle if time allows):**
- Parent/student self-service portal (logged-in)
- Scratch-card-style result checker (admission no. + serial no.)
- SMS/email notification settings + bulk defaulter reminders

**Could have (later phase):**
- Timetable module (genuinely new — the legacy version was never built)
- ID card generation
- Role/permission matrix UI beyond the fixed role enum

**Won't have (explicitly out of scope for now):**
- Hostel/boarding management, transport routing, staff payroll — each is its own module-sized effort, sequenced only once the above is in real use (per `plan.md` §9)

---

## 5. Success signals

Framed as things worth checking once the system is in use, not hard numeric targets set in advance of any real usage data:
- Time for a bursar to record a term's worth of payments, vs. the legacy system
- Whether report cards get published on time per class (a direct test of whether per-class publish actually solves the problem it was designed for)
- Whether parents use the self-service portal/checker instead of calling the school office for balance/result questions
- Support requests tied to confusing error messages — should trend toward zero given the error-message format standard in `engineering-design.md` §4.3

---

## 6. Risks & assumptions

- **Assumption:** the pilot school's current grading scale, psychomotor/affective trait lists, and fee structure can be gathered directly from them rather than re-derived from the legacy database, since no SQL dump was available to migrate from directly.
- **Risk:** hosting constraints (cPanel/CloudLinux LVE memory limits, already hit once on the Hope Nurse Node deployment) could shape technical decisions (session storage, process management) in ways that ripple into product timeline — flagged as open in `plan.md` §10, not yet resolved.
- **Risk:** moving from a global per-term publish to per-class publish is a workflow change for whoever currently manages result publishing — worth walking them through the new flow before launch, not just shipping it silently.
- **Assumption:** parents currently comfortable with the scratch-card-style checker will still want that option even once a logged-in portal exists — kept as a parallel path rather than assuming everyone migrates to logging in.

---

## 7. Open product questions

- Final product name (still "EduCore" as a placeholder per `plan.md`).
- Whether the "should have" tier (parent portal + notifications) ships in the same release as the "must have" tier, or as a fast-follow a few weeks later.
- Who at the pilot school owns confirming the grading scale/trait lists/fee structure data needed to seed settings before go-live.
