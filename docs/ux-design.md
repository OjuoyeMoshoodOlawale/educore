# EduCore — User Experience Design

Companion to `engineering-design.md` §4 (the component APIs this doc specifies the visuals for) and the brand token table already established in `anyschool-design.md` §2 (kept as the design-token source of truth — not repeated in full here, referenced by variable name).

---

## 1. Design principles

- **Clarity over density.** The legacy admin theme (and most Bootstrap-admin templates of its era) packs a lot onto one screen because that's what the desktop-first template made easy. EduCore defaults to showing less per screen, with drill-down, especially on mobile.
- **Consistency over novelty.** One toast pattern, one modal pattern, one error-message format (§4 of this doc, matching `engineering-design.md` §4) — used everywhere, not reinvented per screen.
- **Trustworthy, not playful.** This handles fee payments and academic records — the tone (per the brand section) is calm and credible: deep indigo/gold palette, not bright saturated colors, minimal motion, nothing that reads as "gamified."
- **Mobile-first, not mobile-shrunk.** Every screen is designed for the small viewport first, then expanded for tablet/desktop — not the reverse (matches `plan.md` §7).

---

## 2. Sign-in screen

- Single centered card on a plain background (a subtle, slow gradient animation is acceptable here specifically — per `anyschool-design.md` §4's note on the legacy's `particles.js` login background, kept as *light* motion, not a JS particle library).
- Fields: email/username, password, "Remember me" checkbox, "Forgot password?" link.
- Primary button (`--as-primary` background) full-width on mobile, fixed-width centered on desktop.
- **Error states:**
  - Wrong credentials → one toast (`variant="error"`, "Incorrect email or password") — deliberately not field-specific, so a bad actor can't use error messages to enumerate which emails exist in the system.
  - Empty field submitted → inline validation per `engineering-design.md` §4.3 ("Enter your password"), not a toast.
  - Account locked/rate-limited (ties to the rate-limiting requirement in `engineering-design.md` §3) → inline banner (`AlertBanner variant="warning"`) with a plain-language wait-time message, not a raw "too many requests" error.
- A **separate, visually distinct entry point** for the result-checker (admission no. + serial no.) — not the same form as staff/admin sign-in, since it's a different audience and a different credential model (`plan.md` §6). A single "Check your child's result" link/button from the main sign-in screen routes to it, rather than trying to unify two different auth schemes into one form.
- Loading state: button shows a spinner and disables itself on submit — no double-submit possible, matches the "no ambiguous state" principle carried through the rest of the component specs below.

---

## 3. Reusable component visual specs

### 3.1 Toast / Alert

| State | Color | Icon |
|---|---|---|
| Success | `--as-success` green | check-circle |
| Error | `--as-danger` red | alert-circle |
| Warning | `--as-accent` gold | alert-triangle |
| Info | `--as-primary` indigo | info |

- Rounded corners at `--as-radius`, left border accent stripe in the state color, white/neutral-50 background (not a fully-colored background — keeps it legible and calm rather than alarming, especially for `error`).
- Position: top-right on desktop, full-width top banner on mobile (thumb-reachable dismiss on the right edge either way).
- Auto-dismiss after 4s for success/info, persists until manually dismissed for error/warning (a payment failure shouldn't disappear before the user reads it).
- Entrance/exit: slide + fade, 300ms ease — the same timing used for sidebar/modal transitions elsewhere, so motion feels like one consistent system rather than a different animation per component.

### 3.2 Modal

- Centered overlay on desktop (max-width per `size` prop), backdrop at 50% black opacity with a slight blur.
- On mobile: bottom-sheet (slides up from the bottom edge, rounded top corners only) rather than a centered box — easier to reach one-handed, consistent with `plan.md` §7's mobile modal guidance.
- Header: title + close icon (top-right, 44×44px touch target per the accessibility minimum). Footer: right-aligned action buttons, primary action rightmost, destructive actions in `--as-danger` and always paired with a cancel option — never a lone destructive button.
- Persistent variant (for destructive confirmations) removes the close icon and disables backdrop/Escape dismissal, forcing an explicit choice.

### 3.3 Form validation

- Inline field errors: red text (`--as-danger`) directly below the input, small warning icon inline with the text, red border on the input itself (`--as-danger` at reduced opacity, not full saturation — avoids the input looking "broken," just "needs attention").
- Required-field indication: a subtle asterisk next to the label, not red until actually invalid — red is reserved for an active error state, not a permanent visual "this is required" marker.
- Success state on a field (once corrected) — border returns to neutral, no green checkmark flourish; the absence of an error is the confirmation, avoiding visual noise on long forms (the legacy admission/staff forms are already long — no need to add celebratory micro-interactions per field).

---

## 4. Navigation & layout

- **Desktop:** left sidebar (icons + labels), collapsible to icon-only, 300ms ease transition — direct carryover from the Le Rouge pattern already specified in `anyschool-design.md` §4.
- **Mobile (<768px):** bottom tab bar for the 4–5 most-used destinations per role (e.g. a subject teacher's bottom bar is Score Entry / My Classes / Notifications / Profile — not the full admin menu shrunk down), with a slide-over drawer for everything else. Different roles see a different bottom bar, not the same admin-shaped nav scaled down.
- **Broadsheet/score-entry grid on mobile:** card-per-student layout (per `plan.md` §7), with a persistent "switch to table view" toggle for a teacher on a tablet who has the screen width to prefer the grid.

---

## 5. States every screen needs (not just the happy path)

- **Empty state:** e.g. no fee structure set up yet for a class — a short explanatory line + a clear primary action ("Set up fee structure"), not a blank table with no explanation.
- **Loading state:** skeleton placeholders matching the eventual content's shape (a skeleton table for the broadsheet, a skeleton card for a student profile) rather than a generic spinner for anything that takes more than ~300ms.
- **Error state (data failed to load):** an inline retry affordance in the content area itself, in addition to the toast — a toast alone can be missed or dismissed before the user finishes reading it.

---

## 6. Branding integration

- Every component above consumes the CSS custom properties from `anyschool-design.md` §2 (`--as-primary`, `--as-accent`, `--as-success`, `--as-danger`, `--as-radius`, `--as-space`) — no component hardcodes a hex value, which is also what makes the later multi-tenant/per-school re-theming idea (`anyschool-design.md` §4's note on Le Rouge's swappable SASS variables) a token change, not a rewrite.
- Typography: Inter/system-ui throughout (already set), with one consistent type scale (e.g. 12/14/16/20/24/32px) — the legacy templates mix several unrelated font choices (`icomoon`, `Erica One`, `ZCOOL KuaiLe` were all found bundled in the Le Rouge CSS for different decorative purposes) — EduCore uses exactly one typeface family for UI text, full stop.
- Iconography: `lucide-vue-next` exclusively (per `plan.md` §4) — one icon set, one visual weight, across every screen including the components in this doc.

---

## 7. Open UX questions

- Whether the login screen's subtle background animation is wanted at all, or whether a fully static background is preferred for a system this administrative/financial in nature — leaning static, but worth a quick call.
- Confirm the 4–5 items in each role's mobile bottom tab bar with actual users (a subject teacher, a bursar) before finalizing — the set in §4 above is a reasonable first guess, not user-tested.
