# EduCore — Accounting & Sundry Sales: Rules of Engagement

Research-first, as asked, before any schema or UI for this gets built. One disclaimer up front: this defines engineering/product rules, not formal accounting or audit advice — for the pilot school's actual statutory bookkeeping and tax filing, their own accountant or auditor should still review the chart of accounts and reporting output before it's relied on for compliance. What follows is scoped to be *informed by* real accounting practice, not a substitute for a qualified accountant.

Both modules are confirmed as wanted, but sequenced **after** Phases 1–5 — this is Phase 9 in the updated list (§5).

---

## 1. Regulatory grounding (Nigeria)

Nigeria's accounting standard-setter is the **Financial Reporting Council of Nigeria (FRC)**, and IFRS has been adopted as the basis of financial reporting there. Full statutory IFRS compliance is a heavier bar than a small private school's internal bookkeeping typically needs day to day — the practical target for EduCore's accounting module is **IFRS-informed double-entry bookkeeping** (the same underlying principles: dual-aspect/double-entry, accrual basis, consistent chart of accounts) at a scale appropriate for a small-to-mid private school, not a full statutory reporting suite. If a school later needs formal statements for tax or audit purposes, the data this module produces (a clean trial balance, consistent journal history) is what an external accountant would need anyway — it's a solid foundation either way.

## 2. Chart of accounts

Standard five-category structure, numbered by convention (matches what's already in SchoolFees Manager's schema):
```
1000–1999  Assets       (Cash, Bank accounts, Accounts Receivable — student fee balances, Inventory)
2000–2999  Liabilities  (Accounts Payable, unearned/advance fee payments)
3000–3999  Equity       (Owner's equity / retained earnings)
4000–4999  Income       (Tuition fee income, sundry sales income, other income)
5000–5999  Expenses     (Salaries, utilities, maintenance, supplies)
```
Each school gets a sensible **default chart of accounts** seeded on setup (same "auto-fill defaults" principle already applied elsewhere in the settings), editable and extendable — a school can add sub-accounts (e.g. splitting "Utilities" into "Electricity" and "Water") without restructuring the whole chart.

## 3. Double-entry rules of engagement

- **Every financial event is a balanced journal entry** — total debits equal total credits, enforced at the database/service layer, not just trusted from the UI. No entry can be saved unbalanced.
- **Auto-posting from source modules, not manual entry, for routine transactions.** A fee payment posts itself (`Dr Cash/Bank`, `Cr Accounts Receivable`) the moment it's recorded in the Fees module — a bursar shouldn't need to separately "do the accounting" for a payment they already recorded. Same for sundry sales, expenses, and payroll once those modules exist. **Manual journal entries** are reserved for genuine adjustments (opening balances, corrections, accruals) — not the default way transactions enter the books.
- **Immutable once posted.** A posted journal entry is never edited in place — corrections are a **reversal entry plus a new correct entry**, both visible in the history. This is the same principle already applied to payment reversal in `schoolfees-manager-alignment.md` §6, extended to the whole ledger.
- **Segregation of duties**, as far as a small school's staffing realistically allows: the person recording a transaction and the person approving a reversal or a manual adjustment above a school-configurable threshold shouldn't default to the same permission — this is exactly what the fine-grained permission-override system (`platform-addendum.md` §5) is for, applied to accounting specifically rather than a new mechanism.
- **Period locking.** Once a term (or month, whichever cadence the school prefers) is closed, no new postings land in it without explicitly reopening — a permission-gated action, logged in the audit trail, not a routine one. This directly prevents the "someone accidentally back-dates an entry into a period that's already been reported on" problem that's the most common real-world bookkeeping error.
- **Reporting outputs, minimum viable set:** trial balance, income statement (by term or by month), balance sheet, and a general ledger view per account — the four reports that make the rest of this actually useful rather than just a well-structured database no one looks at.

## 4. Sundry sales — scope

A simpler module than full accounting, and it feeds into it rather than duplicating it:
- **Item catalog** — things a school sells outside the core fee bill (uniforms, textbooks, event tickets), each with a price and optional stock count.
- **Sale transaction** — pick items, quantity, buyer (a student, or a walk-in), record payment (full or partial, reusing the same payment-account tracking from `addendum-v4.md` §6).
- **Auto-posts to accounting** the same way a fee payment does (`Dr Cash/Bank`, `Cr Sundry Sales Income`) — no separate manual bookkeeping step.
- **Inventory link is optional, not required for v1** — if the item catalog is backed by real stock counts, a sale can decrement inventory; if a school doesn't care about stock tracking (just wants to record that money came in for a uniform sale), the sale still works without it. Full inventory management (reordering, stock takes) is its own module, same as SchoolFees Manager treats it — not bundled into sundry sales' first version.

## 5. Updated phase list

Extends `addendum-v4.md` §11:
- **Phase 9 (new): Accounting & Sundry Sales** — chart of accounts, auto-posting from Fees/Sundry Sales, manual journal entries with approval rules, period locking, the four core reports in §3. Sequenced last because it depends on Fees (Phase 2) and benefits from Payroll/Expenses existing first if those ever get scoped — but chart-of-accounts setup and the reporting shell can start as soon as Phase 2's payment data exists, since fee income is the first real transaction type it needs to post.

## 6. What's still open

- Exact period-locking cadence (monthly vs. termly) — leaning termly to match how the rest of EduCore is organized, but worth confirming against how the pilot school's bursar actually wants to work.
- Whether payroll gets scoped at all (SchoolFees Manager has it; nothing in EduCore's plan currently calls for it) — flagged here only because accounting auto-posting is more complete once payroll exists as a source, not because it's been asked for.
