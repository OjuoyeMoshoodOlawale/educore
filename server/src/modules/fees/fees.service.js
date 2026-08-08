// Ledger math matches plan.md §4:
// opening_balance = sum of all prior terms' (charges - payments)
// current_term_charges = matching fee_structures (eligibility-filtered) + fee_adjustments for that term
// total_balance = opening_balance + current_term_charges - current_term_payments

async function getEligibleCharges(trx, studentId, termId) {
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
      (s.applies_to_boarding_type === 'all' || s.applies_to_boarding_type === student.boarding_type) &&
      (s.applies_to_intake === 'all' || s.applies_to_intake === enrollment.intake_type)
  );

  const adjustments = await trx('fee_adjustments').where({ student_id: studentId, term_id: termId });
  const total =
    eligible.reduce((sum, s) => sum + Number(s.amount), 0) + adjustments.reduce((sum, a) => sum + Number(a.amount), 0);

  return { structures: eligible, adjustments, total };
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

export async function getStudentLedger(db, studentId, termId) {
  return db.transaction(async (trx) => {
    const priorIds = await priorTermIds(trx, termId);

    let openingBalance = 0;
    for (const tid of priorIds) {
      const enrolled = await trx('student_terms').where({ student_id: studentId, term_id: tid }).first();
      if (!enrolled) continue; // student wasn't enrolled that term — nothing carries from it
      const charges = await getEligibleCharges(trx, studentId, tid);
      const paid = await getPaymentsTotal(trx, studentId, tid);
      openingBalance += charges.total - paid;
    }

    const current = await getEligibleCharges(trx, studentId, termId);
    const currentPaid = await getPaymentsTotal(trx, studentId, termId);

    return {
      openingBalance,
      currentCharges: current.total,
      currentPaid,
      totalBalance: openingBalance + current.total - currentPaid,
      breakdown: { structures: current.structures, adjustments: current.adjustments }
    };
  });
}
