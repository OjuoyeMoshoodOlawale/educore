// Ledger math now matches schoolfees-manager's tested formula exactly (electron/handlers/billing.js):
//   bill_total = sum of student_bills.amount, excluding 'waived'/'frozen'
//   adj_total  = sum of adjustments — 'percent' mode is a % of bill_total, 'fixed' is a flat amount;
//                'discount' subtracts, 'addition' adds (amount is always stored positive, per SFM's
//                validation rules — sign comes from `type`, never from the number itself)
//   prev_balance = sum of previous_term_balance.balance_amount for this term (a snapshot, not
//                  recomputed live — set once via generate/auto-compute, same as SFM)
//   total_expected = bill_total + prev_balance + adj_total
//   balance = total_expected − total_paid
//
// Falls back to the original live fee_structures-eligibility calculation when a student has no
// student_bills/previous_term_balance rows yet for a term — this is a transitional path for data
// that predates the "Generate Bills" step existing; once bills are generated, they take over.

function computeAdjustmentTotal(billTotal, adjustments) {
  let total = 0;
  for (const adj of adjustments) {
    if (adj.type) {
      // New-style row (matches SFM): amount is always positive, sign comes from `type`.
      const value = adj.calc_mode === 'percent' ? (Number(adj.amount) / 100) * billTotal : Number(adj.amount);
      total += adj.type === 'addition' ? value : -value;
    } else {
      // Legacy row from before this migration: sign was encoded directly in the amount.
      total += Number(adj.amount);
    }
  }
  return total;
}

async function getEligibleChargesLive(trx, studentId, termId) {
  const enrollment = await trx('student_terms').where({ student_id: studentId, term_id: termId }).first();
  if (!enrollment) return { structures: [], adjustments: [], total: 0 };

  const student = await trx('students').where({ id: studentId }).first();
  const structures = await trx('fee_structures as fs')
    .join('fee_items as fi', 'fi.id', 'fs.fee_item_id')
    .where({ 'fs.class_id': enrollment.class_id, 'fs.term_id': termId })
    .select('fs.*', 'fi.name as fee_item_name');

  const eligible = structures.filter(
    (s) =>
      (s.applies_to_gender === 'all' || s.applies_to_gender === student.sex) &&
      (s.applies_to_boarding_type === 'all' || s.applies_to_boarding_type === enrollment.boarding_type) &&
      (s.applies_to_intake === 'all' || s.applies_to_intake === enrollment.intake_type)
  );

  const adjustments = await trx('fee_adjustments').where({ student_id: studentId, term_id: termId });
  const billTotal = eligible.reduce((sum, s) => sum + Number(s.amount), 0);
  const total = billTotal + computeAdjustmentTotal(billTotal, adjustments);

  return { structures: eligible, adjustments, total };
}

async function getEligibleChargesFromBills(trx, studentId, termId, bills) {
  const billTotal = bills.reduce((sum, b) => (['waived', 'frozen'].includes(b.status) ? sum : sum + Number(b.amount)), 0);
  const adjustments = await trx('fee_adjustments').where({ student_id: studentId, term_id: termId });
  const total = billTotal + computeAdjustmentTotal(billTotal, adjustments);
  return { structures: bills, adjustments, total };
}

async function getEligibleCharges(trx, studentId, termId) {
  const bills = await trx('student_bills as sb')
    .join('fee_structures as fs', 'fs.id', 'sb.fee_structure_id')
    .join('fee_items as fi', 'fi.id', 'fs.fee_item_id')
    .where({ 'sb.student_id': studentId, 'sb.term_id': termId })
    .select('sb.*', 'fi.name as fee_item_name');

  return bills.length ? getEligibleChargesFromBills(trx, studentId, termId, bills) : getEligibleChargesLive(trx, studentId, termId);
}

async function getPaymentsTotal(trx, studentId, termId) {
  const rows = await trx('payments').where({ student_id: studentId, term_id: termId }).whereNull('reversed_at');
  return rows.reduce((sum, p) => sum + Number(p.amount), 0);
}

async function priorTermIds(trx, termId) {
  const term = await trx('terms').where({ id: termId }).first();
  const sameSessionEarlier = await trx('terms').where('session_id', term.session_id).andWhere('id', '<', termId).pluck('id');
  const earlierSessionIds = await trx('sessions').where('id', '<', term.session_id).pluck('id');
  const earlierSessionTerms = earlierSessionIds.length
    ? await trx('terms').whereIn('session_id', earlierSessionIds).pluck('id')
    : [];
  return [...earlierSessionTerms, ...sameSessionEarlier];
}

async function computeLiveOpeningBalance(trx, studentId, termId) {
  const priorIds = await priorTermIds(trx, termId);
  let openingBalance = 0;
  for (const tid of priorIds) {
    const enrolled = await trx('student_terms').where({ student_id: studentId, term_id: tid }).first();
    if (!enrolled) continue;
    const charges = await getEligibleCharges(trx, studentId, tid);
    const paid = await getPaymentsTotal(trx, studentId, tid);
    openingBalance += charges.total - paid;
  }
  return openingBalance;
}

export async function getStudentLedger(db, studentId, termId) {
  return db.transaction(async (trx) => {
    const snapshot = await trx('previous_term_balance').where({ student_id: studentId, to_term_id: termId }).first();
    const openingBalance = snapshot ? Number(snapshot.balance_amount) : await computeLiveOpeningBalance(trx, studentId, termId);

    const current = await getEligibleCharges(trx, studentId, termId);
    const currentPaid = await getPaymentsTotal(trx, studentId, termId);

    return {
      openingBalance,
      currentCharges: current.total,
      currentPaid,
      totalBalance: openingBalance + current.total - currentPaid,
      breakdown: { structures: current.structures, adjustments: current.adjustments },
      openingBalanceIsSnapshot: !!snapshot
    };
  });
}

// Materializes charges into student_bills — matches schoolfees-manager's `bills:generate-class`
// exactly, including its idempotency (a student already billed for a given fee structure is
// skipped, never double-charged) and its eligibility check (gender/intake/boarding).
export async function generateClassBills(db, { classId, termId }) {
  return db.transaction(async (trx) => {
    const students = await trx('student_terms as st')
      .join('students as s', 's.id', 'st.student_id')
      .where({ 'st.class_id': classId, 'st.term_id': termId, 'st.status': 'active' })
      .select('s.*', 'st.intake_type', 'st.boarding_type');

    if (!students.length) return { generated: 0, skipped: 0, students: 0 };

    const configs = await trx('fee_structures').where({ class_id: classId, term_id: termId });
    if (!configs.length) {
      const err = new Error('No fee structure found for this class and term. Configure fees first.');
      err.status = 422;
      throw err;
    }

    let generated = 0;
    let skipped = 0;
    for (const student of students) {
      for (const config of configs) {
        const gOk = config.applies_to_gender === 'all' || config.applies_to_gender === student.sex;
        const iOk = config.applies_to_intake === 'all' || config.applies_to_intake === student.intake_type;
        const bOk = config.applies_to_boarding_type === 'all' || config.applies_to_boarding_type === student.boarding_type;
        if (!gOk || !iOk || !bOk) continue;

        const existing = await trx('student_bills').where({ student_id: student.id, term_id: termId, fee_structure_id: config.id }).first();
        if (existing) {
          skipped++;
          continue;
        }
        await trx('student_bills').insert({
          student_id: student.id,
          term_id: termId,
          fee_structure_id: config.id,
          amount: config.amount,
          is_compulsory: true,
          status: 'pending'
        });
        generated++;
      }
    }

    return { generated, skipped, students: students.length };
  });
}

// Snapshot carry-forward for every active student in a term — matches SFM's `carryover:auto-compute`.
export async function autoComputeCarryover(db, { fromTermId, toTermId }) {
  return db.transaction(async (trx) => {
    const studentIds = await trx('student_terms').where({ term_id: fromTermId, status: 'active' }).pluck('student_id');
    let computed = 0;
    for (const studentId of studentIds) {
      const charges = await getEligibleCharges(trx, studentId, fromTermId);
      const paid = await getPaymentsTotal(trx, studentId, fromTermId);
      const prevSnapshot = await trx('previous_term_balance').where({ student_id: studentId, to_term_id: fromTermId }).first();
      const carriedIn = prevSnapshot ? Number(prevSnapshot.balance_amount) : 0;
      const balance = carriedIn + charges.total - paid;

      const existing = await trx('previous_term_balance').where({ student_id: studentId, to_term_id: toTermId }).first();
      if (existing) {
        await trx('previous_term_balance').where({ id: existing.id }).update({ balance_amount: balance, from_term_id: fromTermId, updated_at: trx.fn.now() });
      } else {
        await trx('previous_term_balance').insert({ student_id: studentId, from_term_id: fromTermId, to_term_id: toTermId, balance_amount: balance });
      }
      computed++;
    }
    return { computed };
  });
}
