# EduCore — Engineering Design

Companion to `plan.md` (architecture/schema) and `ux-design.md` (visual spec for the components below). This doc is the code-level contract: style rules, security requirements, and reusable component APIs, written so two engineers touching different modules end up producing consistent code without needing to ask each other first.

---

## 1. Clean code principles

**String building — template literals, not concatenation.** The legacy codebase's biggest local readability problem was string concatenation (`"SELECT * from result where studid=".$id.""`) — hard to scan, easy to typo a missing quote or space. The rebuild's rule, front and center because it was called out directly:

```js
// Not this:
const msg = "Hello " + name + ", you have " + count + " unread messages";

// This:
const msg = `Hello ${name}, you have ${count} unread messages`;
```

Applies everywhere: log messages, error strings, generated SQL fragments (though see §3 — raw SQL string-building for queries is banned outright, not just style-fixed), URL building, class-name binding in Vue templates (`:class="`${base} ${variant}`"` over string concatenation with `+`).

**Function size & single responsibility.** The legacy `reportcard.php` mixes DB queries, ranking math, and HTML rendering in one 892-line file. Rebuild rule: a function does one thing. Route handler → calls a service function → service calls a repository function. No SQL inside a controller, no business logic inside a route handler, no rendering logic inside a service.

**Naming.** Full words, no abbreviations that aren't domain-standard. `ca1`/`ca2`/`exam` survive as domain terms (they're what teachers call them); `sql1`, `sqlp`, `sqlzz`, `resultqc` (real legacy variable names) do not. A variable holding a list is plural (`students`, not `studentlist` or `stud`).

**No magic numbers/strings.** The legacy hardcodes `'first term'`, `'Second term'` (inconsistent casing — this is the actual bug source discussed in `plan.md` §3) directly in queries throughout. Rebuild: term identity is a `term_id` FK, never a compared string, anywhere.

**Early returns over nested conditionals.** The legacy's grade/rank rendering is 5+ levels of nested `if/elseif`. Guard clauses and early returns keep functions flat and scannable.

**Comments explain *why*, not *what*.** The legacy has commented-out dead SQL sitting next to live SQL in the same file (`reportcard.php` line 219 comments out one `session_term` query right above an identical live one). No commented-out code in the rebuild — delete it, git history keeps it if it's ever needed.

---

## 2. Error handling & API response contract

One shape for every API response, success or failure, so the frontend never has to guess:

```ts
// Success
{ success: true, data: T }

// Validation failure (422)
{ success: false, errors: [{ field: "email", message: "Enter a valid email address" }] }

// Any other failure (400/401/403/404/409/500)
{ success: false, message: "Human-readable summary" }
```

- Validation errors are always field-scoped and always an array — even for a single bad field — so the frontend's error-mapping logic never has a special case for "exactly one error."
- Every route handler is wrapped so an uncaught exception becomes a `{ success: false, message: "Something went wrong" }` 500, logged server-side with the real stack trace via `pino` — never a raw stack trace or SQL error string sent to the client (the legacy's `error_reporting(0)` hides errors from the *developer* too, which is the wrong direction; the rebuild logs everything server-side and shows nothing sensitive client-side).
- HTTP status codes are meaningful and consistent: 401 (not authenticated) vs 403 (authenticated, not authorized) are never conflated — a real gap in the legacy, which redirects to login for both cases indiscriminately.

---

## 3. Security requirements

Non-negotiable, checked in code review, not just described:

- **Parameterized queries only.** Every single legacy file that builds SQL via string concatenation of `$_POST`/`$_GET` (`editschoolbillitems.php`, `updateresult.php`, `updatecomment_att.php`, `promotion.php`, and effectively every other write-path file surveyed in `plan.md`) is a live SQL-injection vector. Knex's parameter binding (`.where('id', id)`, never `.whereRaw(`id = ${id}`)`) is mandatory, no exceptions, including for admin-only screens — "only staff can reach this form" was also true of the legacy system and didn't stop the vulnerability.
- **Dynamic column names are banned from user input.** `updatecomment_att.php`/`updateresult.php` build `UPDATE table SET $field = ...` from a raw POST field name. The rebuild never interpolates a column name from request input — every writable field is named explicitly in the service-layer code, not passed through.
- **Auth:** session-based, `httpOnly` + `secure` + `sameSite=strict` cookies, passwords hashed with `argon2` (or `bcrypt` if the hosting environment can't run argon2's native bindings — confirm against the cPanel constraint already hit on Hope Nurse's Node deployment). No plaintext password storage or comparison anywhere (the legacy `resultchecker.php` has a commented-out `passwording` plaintext-compare line — a reminder of what not to do, not something to migrate).
- **CSRF tokens** on every state-changing request, since this is a monolith serving its own session-cookie-authenticated SPA.
- **RBAC middleware**, not per-screen ad-hoc checks. The legacy checks `$_SESSION['alogin']` presence per file with no role granularity beyond "logged in or not." The rebuild's `users.role` enum backs an actual middleware (`requireRole('principal')`, `requireRole(['admin','bursar'])`) applied at the route level, so a permission change is a route-table edit, not a hunt through every file that happens to touch that data.
- **File uploads** (student/staff photos, staff signatures, school logo): validate MIME type and file size server-side (not just an `accept=` attribute on the input, which is client-side only and trivially bypassed), store with randomized filenames outside the web root or behind an authenticated route, strip EXIF metadata from photos before storage.
- **Secrets in environment variables, never source.** The legacy `includes/config.php` has live DB credentials committed in plaintext, and `sms.php`/`workingsms.php` have an SMS API key hardcoded and — worse — rendered into a visible HTML input on the page. The rebuild's `.env` (git-ignored) holds DB credentials, session secret, and the `notification_settings` encryption key; nothing sensitive ever reaches a template.
- **Rate limiting** on the login and result-checker (admission no. + serial no.) endpoints specifically — the serial-number checker is a 2-factor-lite scheme (something the guardian was given + something they know) and is exactly the kind of endpoint worth throttling against brute-force guessing, which the legacy has no protection against at all.
- **Dependency scanning** (`npm audit` / Dependabot) as part of CI, given the legacy's vendored jQuery plugins (some quite old — `jquery-3.0.0.js` was seen mid-upload earlier in this project) are exactly the kind of dependency that accumulates known CVEs if never revisited.

---

## 4. Reusable component system

Three components used everywhere in the app — built once, in one place, imported everywhere else. No screen builds its own ad-hoc alert `<div>` or modal.

### 4.1 Toast / Alert

Single component, two ways to use it:

```ts
// Global (via a composable, backed by one <ToastContainer /> mounted once in App.vue)
const toast = useToast()
toast.success("Payment recorded")
toast.error("Could not save — check your connection")
toast.warning("This student already has a result for this term")
toast.info("Report cards publish tomorrow at 8am")

// Inline (same visual component, used standalone in a page — e.g. a banner above a form)
<AlertBanner variant="warning" title="Unsaved changes" dismissible />
```

**Props (shared shape):** `variant: 'success' | 'error' | 'warning' | 'info'`, `message: string`, `title?: string`, `duration?: number` (ms; toasts auto-dismiss, `0` = persist until manually closed), `dismissible?: boolean`.
**Behavior:** toasts stack (max 3 visible, oldest drops off), slide in from the top-right on desktop / top on mobile, 300ms ease (consistent with the motion timing already set in `plan.md` §7). Screen-reader announced via `aria-live="polite"` (`"assertive"` for `error`).

### 4.2 Modal

```ts
<BaseModal v-model="isOpen" title="Delete class?" size="sm">
  <p>This can't be undone.</p>
  <template #footer>
    <BaseButton variant="ghost" @click="isOpen = false">Cancel</BaseButton>
    <BaseButton variant="danger" @click="confirmDelete">Delete</BaseButton>
  </template>
</BaseModal>
```

**Props:** `modelValue: boolean` (v-model), `title: string`, `size: 'sm' | 'md' | 'lg' | 'full'`, `closable?: boolean` (default true — Escape key + backdrop click), `persistent?: boolean` (true disables backdrop/Escape close, for destructive confirmations that need an explicit button press).
**Behavior:** focus-trapped while open, focus returns to the triggering element on close, backdrop fades in/out with the modal (same 300ms), body scroll locked while open. On mobile, `size='full'` or a `bottomSheet` variant slides up from the bottom instead of centering — matches the mobile-first bottom-sheet pattern already specified in `plan.md` §7.

### 4.3 Form validation error message format

One convention, used by every form in the app:

- **Field-level errors** render inline, directly under the input, in `--as-danger` red, with a small warning icon — never as a toast. Sourced directly from the API contract's `errors[]` array in §2 (`{ field, message }` maps 1:1 to a field's inline error slot).
- **Form-level/network errors** (couldn't reach the server, unexpected 500) render as a toast (`toast.error(...)`), not inline — since they're not tied to any one field.
- **Error copy is specific, not generic.** "Enter a valid email address," not "Invalid input." "This field is required," not "Error." Matches the plain-language tone already set for the rest of the product.
- **Validation runs on blur, not on every keystroke** (avoids the jarring "error while still typing" pattern), and re-validates on submit regardless, so a field that was never blurred still gets caught.

---

## 5. Frontend architecture notes

- **State:** Pinia, one store per domain (`useFeesStore`, `useResultsStore`, `useSettingsStore`) — no single monolithic store.
- **API layer:** one typed API client module per domain, thin wrapper over `fetch`/`axios` returning the `{success, data}`/`{success, errors}` shape from §2 — components never call `fetch` directly.
- **Component organization:** `components/base/` for the reusable primitives in §4 (Toast, Modal, Button, Input, Card), `components/<domain>/` for feature-specific components (e.g. `components/results/ScoreEntryGrid.vue`), `views/` for routed pages.
- **`data-testid` convention:** every interactive element that a test will target gets a `data-testid="<domain>-<element>"` attribute (e.g. `data-testid="fees-payment-submit"`) — ties directly into `test-design.md` §3's e2e selector strategy, so tests don't rely on CSS classes or text content that a redesign could break.

---

## 6. Open engineering questions

- Argon2 vs. bcrypt depends on confirming native-module support on the target cPanel hosting (same class of constraint already hit with Node on Hope Nurse) — needs a quick spike before committing.
- Whether session storage is in-memory (fine for single-instance deployment) or needs Redis depends on the hosting decision still open in `plan.md` §10.
