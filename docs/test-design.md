# EduCore — Test Design

Companion to `engineering-design.md` (the `data-testid` convention and error-contract this doc's tests target) and `plan.md` (the logic being tested, especially the ranking/promotion algorithms).

---

## 1. Strategy — the pyramid

- **Unit tests (Vitest)** — pure functions: the shared `computeCumulativeAverage` ranking function (`plan.md` §2.1), fee balance calculation, grade-boundary lookup, validation schemas (zod). These are the cheapest tests and cover the highest-risk logic (the legacy's ranking math was duplicated across 4+ files with subtle inconsistencies — a single well-tested implementation is the whole point of consolidating it).
- **Integration tests (Vitest + supertest)** — API routes against a real (test) database: does `POST /api/payments` actually update the student's balance, does `PUT /api/results/scores/:id` reject a score above the subject's configured max, does an unauthorized role get a 403 not a 200.
- **End-to-end tests (Playwright)** — a small set of full user journeys, not exhaustive coverage: bursar records a payment and sees the balance update; subject teacher enters scores and a class teacher sees them in the broadsheet; principal publishes a class's results and a parent can then see the report card.
- **Manual/exploratory** — mobile-first layouts (§5) and the printed-PDF report card output are checked by hand each release, since visual/print fidelity isn't well-served by automated assertions.

Ratio in practice: many unit tests, a moderate number of integration tests per module, a handful of e2e journeys covering the paths that span multiple roles.

---

## 2. Critical test cases (highest priority — these encode the actual bugs found in the legacy system)

**Ranking / cumulative average (`computeCumulativeAverage`)**
- First term only → cumulative equals first term average.
- First + second present → average of the two.
- Second present, first missing → cumulative equals second term alone (not divided by 2).
- All three present → average of three.
- Any one of three missing → average of the two that exist, not a divide-by-3 with a zero.
- This function is exactly where the legacy code branches inconsistently (`plan.md` §2.1) — every one of these branches gets its own test, not just a happy-path check.

**Promotion / graduation idempotency**
- Promoting the same student twice for the same target term does not create a duplicate `student_terms` row (the legacy has this guard — `promotion.php`'s existence check — and it should stay covered, not silently regress).
- Graduating a student removes them from the active roster without affecting their historical `subject_scores`/`payments` records (graduation is terminal but not destructive).

**Fee balance calculation**
- Carry-forward from a prior term with a partial payment computes correctly.
- A fee adjustment (scholarship/discount) reduces the balance; an extra charge increases it.
- A student with no fee structure entries for their class/term doesn't error, just shows zero owed.

**Score entry validation**
- A score above the subject's configured `ca1_max`/`ca2_max`/`exam_max` is rejected server-side (not just blocked in the UI — the API itself must not trust the client).
- A subject teacher cannot submit scores for a class/subject they're not assigned to (RBAC enforcement, not just UI hiding the option).

**Publish gating**
- An unpublished class's report card is not visible via the parent portal or the result-checker, even with a correct admission no. + serial no.
- Publishing class A does not publish class B in the same term (this is the entire point of `term_class_publications` over the legacy's term-wide flag — needs an explicit test that publishing one class leaves a sibling class untouched).

**Security regression tests**
- Attempted SQL injection payloads in every text input on the score-entry, fee-adjustment, and comment forms are rejected/escaped, not executed (a direct regression test against the exact class of vulnerability found throughout the legacy codebase).
- A field name that doesn't exist on the target table, submitted as a form field, is ignored rather than causing a dynamic-column update (regression test against the `updatecomment_att.php`/`updateresult.php` dynamic-`$field` vulnerability specifically).
- Login/result-checker endpoints are rate-limited — an automated test hitting the endpoint N+1 times in a window should see the request throttled.

---

## 3. Selector & fixture strategy

- E2E and integration tests select elements via the `data-testid` attributes defined in `engineering-design.md` §5 — never CSS class names or visible text, so a copy or style change doesn't break tests that aren't actually testing that copy/style.
- **Seed data:** a fixture script builds one realistic pilot-school dataset (a handful of classes, subjects, students, staff, one term's worth of scores and payments) — reused across integration and e2e suites rather than each test hand-rolling its own data, so tests stay fast and the fixture itself becomes a living example of "what does a fully set-up school look like."

---

## 4. CI pipeline

On every pull request:
1. Lint + typecheck (ESLint, `vue-tsc`)
2. Unit tests
3. Integration tests (against a disposable test database)
4. A subset of e2e tests (full suite on merge to `main`, not every PR, to keep PR feedback fast)
5. `npm audit` / dependency check (ties to the dependency-scanning requirement in `engineering-design.md` §3)

Merge to `main` blocked on all of the above passing — matches the existing preference for `main`-branch workflows.

---

## 5. Accessibility & mobile testing

- Automated: `axe-core` run against key pages in CI (color contrast, ARIA labeling on the Toast/Modal components from `engineering-design.md` §4, keyboard focus order).
- Manual, each release: keyboard-only navigation through score entry and fee-payment forms (no mouse), screen-reader pass on the sign-in and score-entry screens specifically (highest-frequency, highest-stakes flows), and a real-device check of the mobile broadsheet card-view and bottom-sheet modal pattern from `plan.md` §7 — layout fidelity on a small screen is hard to fully automate.

---

## 6. What's explicitly not covered

Print/PDF pixel-perfect output (report cards, receipts) is checked visually by a human each release rather than via automated screenshot-diffing — the fidelity bar is "looks right printed on paper," which is a judgment call, not a pixel comparison a test can reliably make without becoming flaky.
