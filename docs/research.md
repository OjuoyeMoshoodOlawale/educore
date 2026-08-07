# EduCore — Research Notes

This file grounds the decisions made across `engineering-design.md`, `product-manager-design.md`, `test-design.md`, and `ux-design.md`. Read this alongside those four, not instead of them.

**Important caveat up front:** I don't have live web search in this session. Everything below is either (a) directly grounded in code actually read from the legacy zips, or (b) general professional-practice knowledge, clearly labeled as such rather than presented as fresh 2026 research. Where I'd normally pull current competitor screenshots or recent library version comparisons, I've flagged it instead. If you turn on web search for a follow-up, the sections marked "general knowledge, not verified" are exactly where a real research pass would add the most value.

---

## 1. Grounded in the actual legacy codebase (high confidence — read directly from source)

- The ranking/cumulative-average logic, promotion/graduation flow, and the full reverse-engineered schema in `plan.md` — extracted from grepping and reading the real PHP/SQL across 136 top-level files plus the smaller `portal.islamicity.com.ng` export before it.
- The SQL-injection pattern (string-concatenated queries), the dynamic-`$field` UPDATE vulnerability, hardcoded credentials in `config.php`/`sms.php`, and the `error_reporting(0)` anti-pattern — all directly observed, not assumed.
- The Le Rouge template's actual structure: Bootstrap 4, custom `icomoon` icon font, `lobipanel`, `particles.js`, `notify.js`, ApexCharts/Morris, a 300ms sidebar-collapse transition, and a re-themed green primary color despite the "red" name — all confirmed by reading `main.css` and the vendor folder, not inferred from the template's name/screenshots.
- The Hope Nurse cPanel/CloudLinux LVE memory-limit issue referenced in a few places across these docs — this is a fact from your own prior work, not a general claim about cPanel hosting.

---

## 2. General professional-practice knowledge (not verified against current sources this session)

**Clean code principles** — the naming/function-size/early-return guidance in `engineering-design.md` §1 reflects widely-taught practice (associated most with Robert C. Martin's *Clean Code* and general industry convention around SOLID/single-responsibility), not a citation from a specific 2026 source.

**OWASP-aligned security practices** — parameterized queries, CSRF tokens, RBAC middleware, rate limiting on auth endpoints, secrets in environment variables: this is standard practice reflected in resources like the OWASP Top 10 and OWASP ASVS. I haven't pulled the current-year OWASP Top 10 list to confirm ranking/emphasis hasn't shifted — worth a real check if you want the security section cited more precisely.

**Component/design-system patterns** (toast stacking limits, modal focus-trapping, bottom-sheet-on-mobile, inline-vs-toast error placement) — these match common practice popularized by design systems like Radix, shadcn/ui, and Material Design's guidance on feedback components. I'm describing the pattern, not benchmarking against a specific current library's exact API.

**Testing pyramid / CI structure** in `test-design.md` — standard practice (Vitest + Playwright + supertest is a common, current combination for a Vue+Express stack specifically), not verified against a fresh survey of what's trending in 2026.

**Competitor school-ERP feature sets** (mentioned briefly in `plan.md` §5 — parent portals, ID cards, timetabling, hostel/transport modules as things larger products like Fedena/OpenEduCat/PowerSchool tend to have) — this is category-level general knowledge from training data, not a current feature-by-feature comparison. This is the single area where a real web-search pass would change this document the most; right now it's "what school-ERPs generally tend to include," not "what the current leading products specifically do well or poorly in 2026."

---

## 3. Specific to your operating context (grounded, not general)

- MySQL on shared/cPanel-style Nigerian hosting, Paystack for payments, Termii for SMS — these match patterns already established across your other projects ([[hope-nurse]], [[the-platform-mys]]), not a generic recommendation.
- The scratch-card-style (admission no. + serial no.) result-checker pattern is specifically familiar to Nigerian parents from WAEC/NECO result-checking — this is a reasonable contextual inference from the legacy system's actual implementation, not a verified user-research finding.

---

## 4. Suggested follow-up research (once web search is available)

In priority order, if you want to spend a research pass on strengthening this further:
1. A real feature/UX comparison of 2–3 current Nigerian or African school-management SaaS products, not just the general-category products named above.
2. Current OWASP Top 10 (2025/2026 edition if published) cross-checked against `engineering-design.md` §3's security list.
3. A short accessibility audit reference check (WCAG 2.2 specifics) against the contrast/touch-target numbers already in `ux-design.md`, rather than the general "44px minimum" figure used here.
