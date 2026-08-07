# EduCore — SchoolFees Manager Alignment

Read directly from `OjuoyeMoshoodOlawale/schoolfees-manager` (via the token you provided — used only for this session, never stored). This is the real code, not the remembered feature list — several patterns here are better than what's in the existing EduCore docs, and this addendum says exactly where to change course.

**Housekeeping first:** the token is not saved anywhere in memory or in any file I've written. It only exists in the uploaded file and in this session's shell environment. Since it has write access to both repos, worth rotating/regenerating it once you're done with this session, as routine hygiene for any token that's been pasted into a chat.

---

## 1. What I read

`ARCHITECTURE_STYLE_GUIDE.md` (a full portable blueprint — genuinely excellent, more on this below), `tailwind.config.js`, `src/components/ui/index.jsx`, `src/pages/sessions/SessionsPage.jsx`, `src/pages/settings/RegNumberTab.jsx`, and the structure of `src/pages/settings/DevSettingsPage.jsx` + `SystemErrorsPage.jsx`. Folder listing confirms the module structure (`sessions/`, `classes/`, `fees/`, `billing/`, `payments/`, `students/`, `settings/`, `accounting/`, `payroll/`, `inventory/`, `expenses/`, `sundry/`, `import/`, `auth/`) — this alone validates the module-per-folder approach already in `platform-addendum.md` §7.

## 2. Color palette — needs your call

SchoolFees Manager's real palette is **blue primary (`#1a56db`) with a dark sidebar (`#0f172a`)** — not the indigo/gold I built for EduCore's mockups. When you said "I love the colors," it's ambiguous now which you meant. Confirming before I touch anything: keep EduCore's indigo/gold (`ux-design.md` §2), or switch to SchoolFees Manager's blue/dark-sidebar so the two products look related?

## 3. Reusable components — theirs is simpler, adopt it

`src/components/ui/index.jsx` is **one 186-line file** holding every primitive: `Modal`, `Confirm`, `SearchInput`, `DataTable` (generic, column-config driven, built-in sort), `Field` (label+hint+error wrapper), `StatusBadge`, `PageHeader`, `Spinner`, and an `exportToExcel` helper that lazy-loads the `xlsx` library via dynamic `import()` only when actually called. This is a better answer to "less code, keep it simple" than the more elaborate per-component spec in `engineering-design.md` §4 — the Vue build should follow this shape: a small number of compact, generically-configurable base components in one place, not a sprawling component library. `DataTable` in particular is worth copying almost exactly — pass it a `columns` config and `data`, get sorting and empty-states for free, instead of hand-building a `<table>` per screen the way the current mockups do.

**Confirms and replaces two open items:**
- `Confirm` built as a thin wrapper *around* `Modal`, not a separate component — same pattern EduCore should use for destructive confirmations instead of a bespoke variant.
- The lazy-loaded Excel export directly answers your "use lazy loading where needed" note — same approach applies to PDF export (Puppeteer-equivalent client work, or the print view itself) and any other heavy, occasionally-used library.

## 4. Sessions & terms — adopt this pattern, replace the flat table

`SessionsPage.jsx` is genuinely a better design than `settings/academic-calendar.html`'s flat table:
- Sessions render as **collapsible cards**; terms only load (lazy) when a card is expanded — not all fetched up front.
- Creating a session **auto-generates its three terms** (First/Second/Third) — one action instead of four.
- A single **"Set current" term** drives what's active for billing/entry system-wide — simpler than a separate `is_active` flag per term with no single source of truth.
- Term dates are edited **inline**, in place, via a small form that opens in the row itself — no navigation away.
- New session creation is a **modal** with format-validated input (`YYYY/YYYY` pattern) — directly matches your modal-first CRUD request.
- A clear empty state, and a delete-confirmation that explicitly names the consequence ("Students linked to this session will lose their term placement records") rather than a generic "are you sure."

EduCore's `terms`/`sessions` tables already match this shape closely; the UI needs to change to this pattern, and `next_term_begins` should move from a per-term field to being derived/set at the point a term is marked current, matching how this system treats "current" as the single pivot for the whole app.

## 5. Number sequences — this is meaningfully better than what's planned

`RegNumberTab.jsx` uses a **token format string** (`{PREFIX}/{YEAR}/{SEQ3}`, `{SESSION}`, `{YY}`, `{SEQ4}`, `{SEQ5}`) instead of separate prefix/padding/includes-year fields — strictly more flexible (any order, any separator, session-code support, multiple digit-widths side by side if ever needed), with:
- A live preview panel at the top.
- Eight clickable **preset formats**, each showing its own live-rendered example.
- A **token reference table** so nothing needs to be memorized.
- Sequence reset as three clear radio options (year / never / session) with plain-language consequences.
- An explicit note that changing the format never retroactively renumbers existing records.

This directly replaces the table-based design in `plan.md` §6 and `settings/number-sequences.html` — same underlying `number_sequences` table concept, but `prefix`/`padding_length`/`includes_year` collapse into one `format` string column, and this UI pattern (presets + token buttons + live preview) is what the settings screen should actually look like, generalized to cover admission numbers, staff numbers, and receipt/invoice numbers the way the mockup already intended.

## 6. Schema — a few concrete alignments worth adopting

- **`student_status`** (their naming): `student × term → class + status`, with a `UNIQUE(student_id, term_id)` constraint — EduCore's `student_terms` is the same idea; add the same explicit unique constraint (was implicit before, should be enforced at the schema level, not just application logic).
- **`previous_term_balance`** as its own table, rather than computing carry-forward purely on the fly — worth adopting for the same reason they likely built it that way: it's cheaper to query and gives an auditable snapshot of what carried forward, rather than re-deriving it from the full payment history every time a balance is displayed.
- **Payment reversal fields directly on `payments`** (not a hard delete) — a bursar voiding a mis-entered payment should leave a record that it happened and was reversed, with a reason, not silently disappear. Add `reversed_at`, `reversed_by_staff_id`, `reversal_reason` to EduCore's `payments` table.
- **`payment_items`** — optional allocation of one payment to specific fee-structure lines (useful when a parent pays a specific amount meant to cover, say, just the boarding fee) — worth adding as an optional layer on top of the simpler "payment reduces total balance" model already planned, for schools that want that granularity.
- **`bill_config_copy_log`** — an audit trail specifically for the "copy fee structure from last term" action already mocked in `fees/fee-structure.html` — worth adding rather than leaving that action unlogged.

## 7. Module activation & the developer console — direct validation

`app_state` holds boolean flags (`accounting_enabled`, `payroll_enabled`, `inventory_enabled`), and `DevSettingsPage.jsx` manages activation status, a machine ID, and **separate unlock keys per module** (accounting key, payroll key, inventory key) alongside app-version/update checking and the DB directory location. This is almost exactly the `school_modules` module-activation idea from `addendum-v4.md` §9 — good confirmation it's the right shape, and EduCore's developer console should mirror this per-module-key pattern rather than a single all-or-nothing activation.

`SystemErrorsPage.jsx` — a straightforward errors-list/resolve/delete/clear-resolved flow — is the direct reference for the error-log viewer piece of the same console.

## 8. Two features worth knowing about, not yet decided whether EduCore needs them

- **Sundry sales** — a separate module for things sold outside the core fee bill (extra uniforms, sportswear, one-off activities), with its own receipt numbering, part-payments, and delivery/fulfilment tracking. Not part of any current EduCore phase — flagging because it exists and is a real, separately-useful feature if schools ever want it.
- **Full double-entry accounting** (chart of accounts, journal entries, auto-posted from payments/expenses/payroll) — a much bigger system than anything currently scoped for EduCore. Worth knowing it already exists in SchoolFees Manager if there's ever a need to go beyond simple fee tracking into real bookkeeping — not a near-term recommendation, just noting the reference exists.

---

## 9. What this changes about next steps

Everything above is grounded in real, already-working code — meaningfully more reliable to build from than the memory-derived feature list this was all based on before. Two things to confirm before continuing:

1. **Color palette** — indigo/gold (current EduCore mockups) or blue/dark-sidebar (SchoolFees Manager's actual palette)?
2. **Which direction next** — still open from last turn: convert the existing Phase 1–3 mockups into real Vue components, or start Phase 1's real build (Express + MySQL + Vue) from scratch using the mockups purely as visual reference? Given how much of SchoolFees Manager's *frontend* pattern (component shape, sessions UX, number-sequence UX) is now known, this leans toward the second option being more efficient — build the real thing directly against these now-proven patterns, rather than translating static HTML mockups that were built before this alignment pass.
