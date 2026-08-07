# EduCore — Product & Technical Plan (v2)
*(placeholder rename from "AnySchool" — swap freely, every other section is name-independent)*

**Stack:** Vue 3 + Express, monolithic web repo, mobile-first
**This revision** replaces the v1 plan after a full read of every one of the 136 top-level PHP files in `schportal_latest.zip` (not just the report-card/fees/promotion files from the previous pass), specifically to surface settings, staff, allocation, and class/subject definition screens that hadn't been looked at yet, plus a closer look at `le-rouge-responsive-admin-dashboard-template-main.zip` for mobile-first interface patterns.

---

## 1. Full legacy feature inventory

Every top-level file was grepped for its SQL and form fields; the table below groups them by product area so nothing gets missed going into the redesign.

| Area | Legacy files | What it actually does |
|---|---|---|
| **Auth** | `index.php`, `logout.php`, `resultchecker.php` | Staff/admin login (session-based); a **separate** student/parent "result checker" login by **admission number + serial number** — a scratch-card-style PIN check, not a username/password |
| **School settings** | `schoolprofile.php` | Single-row school profile: name, motto, address, email, phone, website, logo, student/staff ID prefixes |
| **Session/term settings** | `managesession.php`, `addsession.php`, `editsession.php` | Session/term calendar: open/close dates, holiday count, next-term-begins date, and a **per-term `publish` flag** that gates whether results are visible on the student portal |
| **Geo reference data** | `get_state.php`, `get_lga.php`, tables `cities`/`states`/`statelga` | Cascading country → state → LGA dropdowns, used on both student and staff profile forms |
| **Grading settings** | `scoregradingkey.php` (→ `gradelist`), `otherratingkey.php`/`editotherkey.php`/`deleteotherkey.php` (→ `otherratingkey`) | Grade boundary bands (A/B/C + score ranges) and a separate legend table — see §3 for why these get merged |
| **Class definition** | `addclass.php`, `editclass.php`, `manageclass.php`, `deleteclass.php` | Class name + a **manually-typed ranking number** (`classranking`) used purely to control display/print order — this is the field the "drag to reorder" request in §5 replaces | 
| **Subject definition** | `addsubject.php`, `editsubject.php`, `managesubject.php`, `deletesubject.php` | Subject name/code, school section, and — worth calling out, this wasn't visible in the smaller export — **per-subject configurable max-obtainable scores** for CA1/CA2/exam/total, plus a `core` (core vs. elective) flag |
| **School sections** | referenced via `schsection` table (no dedicated CRUD file found — managed inline elsewhere) | Groups classes into sections (e.g. Nursery/Primary/Secondary), each with its own ranking |
| **Staff/teacher profiles** | `addnewstaff.php`, `editstaff.php`, `managestaff.php`, `inactivestaff.php`, `deletestaff.php` | Rich profile: name, DOB, sex, country/state/LGA, phone, email, staff type (role), qualification, institution, graduation year, course, **photo (`passport`) and uploaded signature image** — the signature is captured but, per §6, never actually rendered anywhere |
| **Class-teacher allocation** | `classteacher.php` (UI) + `urlclassallocation.php` (write) | Assigns a class head/class teacher to a class, per term |
| **Subject-teacher allocation** | `subjectteacher.php` (UI) + `urlsubjectallocation.php` (write) | Assigns a subject teacher to a (subject, class) pair, per term |
| **Student definition** | `addstudent.php`, `editstudent.php`, `deletestudent.php`, `inactivestudent.php`, plus 4 gender/boarding-type intake variants (`male_Boarder_new.php`, `male_Boarder_returning.php`, `male_day_new.php`, `male_day_returning.php` and the female equivalents) | Student profile: name, DOB, sex, country/state/LGA, admission year/class, **a single parent/guardian name+phone+email** (no support for multiple guardians), address, occupation, photo |
| **Score entry** | `scoreentry.php`, `updateresult.php`, `get_ca1Obtainable.php`/`get_ca2Obtainable.php`/`get_examObtainable.php` | Teacher score input grid; the "obtainable" endpoints fetch the per-subject max scores from `subjectlist` so the entry form validates against the configured max, not a hardcoded 20/20/60 |
| **Psychomotor/affective entry** | `Psychomotor.php`, `psychomotorm.php`/`editPsychomotorm.php`/`deletepsychomotorm.php`, `affective.php`/`affectivem.php`/`editaffectivem.php`/`deleteaffectivem.php`, `updatepsychomotor_affective.php` | Trait-list settings (admin side) + per-student rating entry (teacher side), against the single `psychomotor_affective` table |
| **Attendance & comments** | `updatecomment_att.php`, `studentresultcomments.php` | Teacher's comment, principal's comment, attendance — see the earlier `comment_att` schema note |
| **Report card** | `reportcard.php`, `reportcard2.php`, `reportcard3.php`, `REPORT_BACKUP.php`, `keepreport.php` | Five overlapping implementations of essentially the same document — a strong signal to build this once, correctly, in the rebuild |
| **Broadsheet** | `broadsheet.php`, `back up alternative.php` (unfinished) | Class-wide subject × student grid |
| **Publishing** | `publish.php`, `urlpublish.php`, `publication.php` (mostly empty) | Toggles `session_term.publish` — this is a **term-wide** switch, not per-class, which is a real limitation (see §6) |
| **Student self-service** | `studentportal.php`, `studentportalreport.php`, `checkresult.php`, `resultchecker.php` | The scratch-card-style result checker plus a logged-in student portal view — both exist, for different access models |
| **Promotion** | `promotion.php`, `promotion_copy.php`, `movetoterm.php` | Covered in v1 — append-only `studentstatus`/`staffstatus` rows per term |
| **Graduation** | `graduation.php`, `GRADUATION.php`, `graduatedstudent.php` | A **separate, terminal** flow from promotion — moves final-class students out of the active roster entirely rather than into a new class |
| **Fees** | `billcreation.php`, `generateclassbill.php`, `schoolbillitems.php`, `editschoolbillitems.php`/`editschoolbilitems.php` (typo'd duplicate), `classbill.php`, `studentbyclassbill.php`, `postpayment.php`, `adjuststudentpersonalbill.php`, `viewclassbilladjustment.php`/`viewclassbill ajustment.php` (another typo'd duplicate) | Covered in the fees-module design already — the duplicated/typo'd filenames here are more of the same "several versions of one screen" pattern |
| **SMS** | `sms.php`, `workingsms.php` | eBulkSMS integration; `workingsms.php` looks like an earlier/alternate credentials version — both have API credentials hardcoded in the file, which is a real exposure independent of anything else in this plan |
| **Timetable** | `timetable.php` | File exists but has **no database queries at all** — this is a stub/placeholder, not a working feature. Timetabling is a genuinely new build in the rebuild, not a migration |
| **Import** | `studentimportengine.php`, uses the bundled `PHPExcel` library | Bulk student import from spreadsheet |
| **Misc/dead code** | `copy.php`, `copywright.php`, `edit.php`, `save_edit.php`, `save_query.php`, `test001.php`, `testing.php`, `testing1.php`, `old_editotherratingkey.php`, `otherratingkey1.php` | Scratch/test files and superseded copies — not a feature, just noting they exist so nobody mistakes them for something to migrate |

---

## 2. Two things worth flagging directly (bugs, not features to copy)

1. **`managesubject.php`** contains a leftover/copy-pasted `UPDATE` statement that writes to the `users` table (`userName`, `password`, `firstName`, `lastName`) keyed on `subjectid` — this doesn't match the page's own purpose (managing subjects) and looks like an unfinished copy-paste from a user-management screen. Don't carry this logic forward; it's a bug, not a spec.
2. **Two typo'd duplicate files** — `editschoolbilitems.php` (missing an "l") alongside `editschoolbillitems.php`, and `viewclassbill ajustment.php` (with a literal space in the filename) alongside `viewclassbilladjustment.php`. Both pairs appear to be the same screen saved twice under slightly different names. One canonical version each in the rebuild.

---

## 3. Redesigned database schema (v2 — extends the v1 fees/results schema)

Everything from the v1 schema (`schools`, `sessions`, `terms`, `students`, `student_terms`, `staff`, `staff_terms`, fees tables, `subject_scores`, `trait_scores`, `student_term_remarks`) still stands. This revision adds the settings/allocation/class-subject tables that weren't visible in the first export, and fixes redundancy found in this pass.

```
-- Settings / reference data
countries
  id, name

states
  id, country_id, name

lgas                          -- replaces legacy statelga; local-government-area, Nigeria-specific
  id, state_id, name

grade_boundaries              -- unchanged from v1, still the gradelist replacement
rating_keys                   -- unchanged from v1, still the gradelist+otherratingkey merge

notification_settings          -- new: makes SMS/email provider config a settings screen, not hardcoded credentials in source
  id, school_id, channel ('sms'|'email'), provider, api_key_encrypted, sender_id, is_active

-- Class/subject/section definition
school_sections
  id, school_id, name, display_order              -- display_order replaces manually-typed classranking; see §5 for how it's set

classes
  id, school_id, section_id, name, display_order   -- same display_order pattern, drag-orderable

subjects
  id, school_id, section_id, name, code, is_core,
  ca1_max, ca2_max, exam_max                       -- recovered from subjectlist: per-subject configurable max obtainable scores, not a fixed split

-- Staff profile (extends v1's staff table)
staff
  id, school_id, staff_no, first_name, last_name, other_name, sex, date_of_birth,
  country_id, state_id, lga_id, phone, email, password_hash,
  staff_type, qualification, institution, graduated_year, course,
  photo_url, signature_url, is_active

class_teacher_assignments          -- unchanged from v1
subject_teacher_assignments        -- unchanged from v1

-- Student profile (extends v1's students table)
students
  id, school_id, admission_no, first_name, last_name, other_name, sex, date_of_birth,
  country_id, state_id, lga_id, admission_year, admitted_class_id,
  address, occupation, photo_url,
  is_result_blocked, block_reason                    -- v3: replaces the scratch-card serial-number gate — see §6

number_sequences                                     -- new (v3): D365 F&O-style configurable number sequences, not hardcoded prefixes
  id, school_id, sequence_for ('admission_no'|'staff_no'|'receipt_no'|'invoice_no'),
  prefix, includes_year (bool), padding_length, next_number, reset_period ('never'|'yearly'|'termly')

student_guardians                                    -- new: replaces the legacy single parentname/parenttel/parentemail with a proper one-to-many relationship
  id, student_id, name, relationship, phone, email, is_primary

terms
  id, session_id, name, opens_on, closes_on, holiday_count, next_term_begins,
  is_active
  -- publish is intentionally NOT a column here — see §6, it moves to a per-class table instead

term_class_publications                              -- new: replaces the legacy term-wide publish flag with per-class granularity
  id, term_id, class_id, is_published, published_at, published_by_staff_id
```

`student_guardians` and `term_class_publications` are the two genuinely new tables this pass adds beyond fixing what the legacy system already had — both are direct answers to limitations found while reading the code, not speculative additions.

---

## 4. Settings module (new section — this pass's main gap-fill)

The legacy system spreads "settings" across a dozen unrelated screens with no single settings home. The rebuild consolidates into one settings area with clear sub-sections:

- **School profile** — name, motto, address, contact info, logo, ID-number prefixes (direct migration of `schoolprofile.php`)
- **Academic calendar** — sessions/terms, open/close dates, holiday count, next-term date (direct migration of `managesession.php`/`addsession.php`)
- **Grading & rating scales** — grade boundaries, rating-key legend, psychomotor/affective trait lists (merges `scoregradingkey.php`, `otherratingkey.php`, `psychomotorm.php`, `affectivem.php` into one settings tab with sub-tabs, instead of four separate unlinked pages)
- **Classes & sections** — class/section definitions with drag-to-reorder (§5)
- **Subjects** — subject definitions including per-subject max-obtainable scores and core/elective flag
- **Notifications** — SMS and email provider configuration (`notification_settings` table above) — this is what replaces the legacy's hardcoded eBulkSMS credentials with an actual settings screen an admin can edit without touching code
- **Geo data** — country/state/LGA reference lists (seeded once, rarely edited, but visible under settings rather than buried in a dropdown-only endpoint)
- **Roles & permissions** — the `users.role` enum from v1, exposed as an actual settings screen

---

## 5. Class & subject settings — drag-to-reorder

The legacy `classranking`/section `ranking` are plain number inputs — an admin manually types "1", "2", "3" per class to control print/display order, and it's easy to end up with gaps or duplicate numbers (nothing in the legacy code enforces uniqueness).

**Rebuild approach:**
- `classes.display_order` and `school_sections.display_order` are still plain integers in the database — that part doesn't change — but the **admin never types them**.
- The settings UI renders classes (within a section) as a drag-sortable list (`vue-draggable-plus`, a Vue 3 wrapper over SortableJS — the legacy codebase actually already ships jQuery UI, which has a sortable widget, but never uses it for this).
- On drop, the frontend sends the new order as a single array of class IDs; the backend re-numbers `display_order` sequentially in one transaction (`PUT /api/settings/classes/reorder { sectionId, orderedClassIds: [...] }`), so there's no way to end up with the legacy's gap/duplicate problem.
- Same pattern for sections themselves (reordering Nursery/Primary/Secondary), and for subjects within a section if a school wants a specific print order on the report card/broadsheet.

---

## 6. Report card, broadsheet, and publishing — this pass's additions

Carried over from v1 unchanged: the shared `computeCumulativeAverage` ranking function, the `trait_scores` unified psychomotor/affective table, the `rating_keys` merge. New from this pass:

- **Signature printing.** Staff `signature_url` and `photo_url` are captured on the profile form in every report-card variant's era, but none of the five report-card files actually render the signature image anywhere on the document. The rebuild's report card should print the class teacher's and principal's signature images where the legacy report card left blank space for a physical pen signature — a real improvement over all five legacy versions, not a migration of existing behavior.
- **Per-class publish, not per-term.** The legacy `session_term.publish` flag is global to the whole term — an admin can't publish Primary 1's results while Primary 6 is still being finalized. `term_class_publications` (§3) fixes this at the schema level.
- **Result check is admission-number-only — the scratch-card serial number is dropped (v3 decision).** A second secret code just adds friction without adding real protection here, and it created an awkward "distribution" problem the legacy system never solved cleanly (who prints/hands out the serial to each parent?). The rebuild's result check is one field, one click: enter the admission number, see the result, if it's published for that class. Withholding a result — most often over unpaid fees — is not something the system enforces silently by hiding data behind a second code; it's `students.is_result_blocked` with a `block_reason`, and a blocked lookup returns a plain message ("Please contact the school office") rather than pretending the result doesn't exist. That's a deliberate, visible decision an admin makes per student, not an automatic side-effect of a missing code.
- **Number sequences, not hardcoded prefixes.** The legacy `schprofile.studnoprefix`/`staffnoprefix` are single fixed strings — an admission number is just that prefix concatenated with whatever number was next. The `number_sequences` table (§3) generalizes this the way a D365 F&O number sequence works: a configurable prefix, optional year segment, zero-padding length, current counter, and a reset rule (never / yearly / per-term) — one settings screen covering admission numbers, staff numbers, and (useful for the fees module) receipt/invoice numbers too, instead of one hardcoded format buried in a school-profile field.

---

## 7. Interface design — mobile-first, extending the Le Rouge pattern table from v1

The v1 doc mapped Le Rouge's desktop-admin patterns (icons, panel collapse, toasts, charts) to Vue equivalents. This pass adds the mobile-first layer, since a good share of actual usage — a teacher entering scores between classes, a parent checking a result on their phone — will be on a small screen, and the legacy Bootstrap 4 admin theme (like most of its era) is desktop-first with responsive breakpoints bolted on rather than a mobile-first build.

- **Layout:** single-column by default, sidebar becomes a bottom nav or slide-over drawer under a `768px` breakpoint — not a shrunk version of the desktop sidebar.
- **Score-entry grid on mobile:** the broadsheet-style "one row per student, one column per subject" table is unusable on a phone; on small screens the same data renders as one card per student (subject/score pairs stacked), with the full grid reserved for tablet-and-up.
- **Touch targets:** minimum 44×44px tap targets throughout (form inputs, table row actions) — the legacy admin theme's dense data-table action icons are sized for a mouse cursor, not a thumb.
- **Report card on mobile:** the print-oriented layout (fixed-width table, side-by-side psychomotor/affective/grade-key panels) is kept as-is for the PDF/print output, but the **in-app preview** before printing/publishing reflows to a single scrollable column on small screens rather than a shrunk-to-fit version of the print layout.
- **Forms:** the legacy admission/staff forms are long single-page forms with every field visible at once; on mobile these become the step-wizard pattern already planned in v1 (§4's `vee-validate` multi-step), which is a better fit for a phone screen regardless of desktop vs. mobile.
- **Animations:** keep the same 300ms ease timing noted in v1 for panel/sidebar transitions, but on mobile favor a slide-up sheet for modals (bottom-sheet pattern) over the legacy's centered modal dialog, which is easier to reach one-handed.

---

## 8. Standard library additions (extends v1 §6)

- `vue-draggable-plus` — drag-to-reorder for classes/sections/subjects (§5)
- A settings-screen form library isn't a new dependency — `vee-validate` + `zod` from v1 covers this too, just with more schemas (one per settings sub-section)
- No new backend dependency needed for per-class publish or guardians — same `knex`/`zod` stack from v1, just more tables

---

## 9. Revised build sequence

1. **Settings foundation first** (new — v1 started directly with fees) — school profile, academic calendar, geo data, grading/rating scales, classes/subjects/sections with drag-reorder. Everything else in the system reads from these, so building fees or results against placeholder settings data would mean re-touching those modules later.
2. **Staff & allocation** — staff profiles, class-teacher and subject-teacher assignment, roles.
3. **Fees module** (as in v1).
4. **Results core** — score entry (validated against each subject's configured max), the shared ranking function, psychomotor/affective, attendance/comments including principal comment.
5. **Report card + broadsheet rendering**, including signature printing and per-class publish.
6. **Promotion + graduation** — both flows, as distinct from each other per §1.
7. **Student/parent self-service** — the logged-in portal, plus the one-field admission-number result check (§6).
8. **Notifications settings + SMS/email delivery**, replacing hardcoded credentials with the `notification_settings` table.
9. Timetable and anything else from the "lower priority" list in the v1 doc, once the above is in real use.

---

## 10. Open decisions (carried over + new)

- Everything listed as open in v1 §8 still stands (naming, Knex vs. Prisma, grading-scale confirmation, parent-portal timing).
- New: confirm whether multiple guardians per student (`student_guardians`) is wanted at launch, or whether matching the legacy's single-guardian model for v1 and expanding later is preferred.
- Resolved in v3: the scratch-card serial number is dropped in favor of a plain admission-number lookup, with blocking handled explicitly via `is_result_blocked`/`block_reason` rather than a missing code (§6).
- I still don't have live web access in this session — the mobile-first guidance in §7 is drawn from general responsive-design practice, not a fresh look at what other 2026 school-management products are currently shipping. Turning on web search for a follow-up pass would sharpen this further if wanted.
