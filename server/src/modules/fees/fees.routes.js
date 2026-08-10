import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { validate } from '../../helpers/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { requireModule } from '../../middleware/moduleGate.js';
import { getStudentLedger, generateClassBills, autoComputeCarryover } from './fees.service.js';
import { nextInSequence } from '../../helpers/numberSequence.js';

const router = Router();
router.use(requireAuth);
router.use(requireModule('fees'));

// ---- Fee items & structure ----
router.get('/items', async (req, res) => {
  res.json({ success: true, data: await db('fee_items').where({ school_id: req.user.school_id }) });
});

router.post('/items', requireRole('admin', 'developer', 'bursar'), async (req, res) => {
  const [id] = await db('fee_items').insert({ school_id: req.user.school_id, name: req.body.name });
  res.status(201).json({ success: true, data: await db('fee_items').where({ id }).first() });
});

router.get('/structure/:classId/:termId', async (req, res) => {
  const rows = await db('fee_structures as fs')
    .join('fee_items as fi', 'fi.id', 'fs.fee_item_id')
    .where({ 'fs.class_id': req.params.classId, 'fs.term_id': req.params.termId })
    .select('fs.*', 'fi.name as fee_item_name');
  res.json({ success: true, data: rows });
});

const structureSchema = z.object({
  fee_item_id: z.number().int().positive(),
  class_id: z.number().int().positive(),
  term_id: z.number().int().positive(),
  amount: z.number().positive('Amount must be greater than zero'),
  applies_to_gender: z.enum(['all', 'male', 'female']).optional(),
  applies_to_intake: z.enum(['all', 'new', 'returning']).optional(),
  applies_to_boarding_type: z.enum(['all', 'day', 'boarder']).optional()
});

router.post('/structure', requireRole('admin', 'developer', 'bursar'), validate(structureSchema), async (req, res) => {
  const [id] = await db('fee_structures').insert({ school_id: req.user.school_id, ...req.validated });
  res.status(201).json({ success: true, data: await db('fee_structures').where({ id }).first() });
});

router.put('/structure/:id', requireRole('admin', 'developer', 'bursar'), async (req, res) => {
  await db('fee_structures').where({ id: req.params.id }).update({ amount: req.body.amount, updated_at: db.fn.now() });
  res.json({ success: true, data: await db('fee_structures').where({ id: req.params.id }).first() });
});

// Copy a class's whole fee structure from one term to another.
router.post('/structure/copy', requireRole('admin', 'developer', 'bursar'), async (req, res) => {
  const { classId, fromTermId, toTermId } = req.body;
  const rows = await db('fee_structures').where({ class_id: classId, term_id: fromTermId });
  if (rows.length) {
    await db('fee_structures').insert(
      rows.map(({ id, created_at, updated_at, ...r }) => ({ ...r, term_id: toTermId }))
    );
  }
  res.json({ success: true, data: { copied: rows.length } });
});

// ---- Adjustments (validation matches schoolfees-manager's electron/handlers/billing.js exactly) ----
router.post('/adjustments', requireRole('admin', 'developer', 'bursar'), async (req, res) => {
  const { student_id, term_id, type, calc_mode, amount, description } = req.body;
  const errors = [];

  if (!student_id) errors.push({ field: 'student_id', message: 'No student specified' });
  if (!['discount', 'addition'].includes(type)) errors.push({ field: 'type', message: 'Adjustment type must be discount or addition' });
  if (!['fixed', 'percent'].includes(calc_mode)) errors.push({ field: 'calc_mode', message: 'Calculation mode must be fixed or percent' });
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) errors.push({ field: 'amount', message: 'Adjustment amount must be greater than zero' });
  if (calc_mode === 'percent' && amt > 100) errors.push({ field: 'amount', message: "A percentage adjustment cannot exceed 100%" });
  if (calc_mode === 'fixed' && amt > 10_000_000) errors.push({ field: 'amount', message: 'Adjustment amount is unreasonably large — please check the figure' });
  if (!description || !String(description).trim()) errors.push({ field: 'description', message: 'A reason is required for every adjustment (audit trail)' });
  if (errors.length) return res.status(422).json({ success: false, errors });

  const [id] = await db('fee_adjustments').insert({
    student_id,
    term_id,
    type,
    calc_mode,
    amount: amt,
    description: String(description).trim(),
    created_by_staff_id: req.user.staff_id
  });
  res.status(201).json({ success: true, data: await db('fee_adjustments').where({ id }).first() });
});

router.delete('/adjustments/:id', requireRole('admin', 'developer'), async (req, res) => {
  await db('fee_adjustments').where({ id: req.params.id }).del();
  res.json({ success: true, data: null });
});

// ---- Generate bills (matches schoolfees-manager's bills:generate-class exactly, including
// its idempotency and gender/intake/boarding eligibility) ----
router.post('/generate-bills', requireRole('admin', 'developer', 'bursar'), async (req, res) => {
  const { classId, termId } = req.body;
  try {
    const result = await generateClassBills(db, { classId, termId });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

router.get('/bills/:classId/:termId', async (req, res) => {
  const rows = await db('student_bills as sb')
    .join('students as s', 's.id', 'sb.student_id')
    .join('student_terms as st', function () {
      this.on('st.student_id', 's.id').andOn('st.term_id', 'sb.term_id');
    })
    .join('fee_structures as fs', 'fs.id', 'sb.fee_structure_id')
    .join('fee_items as fi', 'fi.id', 'fs.fee_item_id')
    .where({ 'st.class_id': req.params.classId, 'sb.term_id': req.params.termId })
    .select('sb.*', 's.first_name', 's.last_name', 's.admission_no', 'fi.name as fee_item_name');
  res.json({ success: true, data: rows });
});

router.post('/bills/:id/waive', requireRole('admin', 'developer'), async (req, res) => {
  await db('student_bills').where({ id: req.params.id }).update({ status: req.body.waive ? 'waived' : 'pending', updated_at: db.fn.now() });
  res.json({ success: true, data: null });
});

// ---- Carry-forward balances (matches schoolfees-manager's carryover:* handlers) ----
router.post('/carryover/auto-compute', requireRole('admin', 'developer', 'bursar'), async (req, res) => {
  const { fromTermId, toTermId } = req.body;
  const result = await autoComputeCarryover(db, { fromTermId, toTermId });
  res.json({ success: true, data: result });
});

router.get('/carryover/:toTermId', async (req, res) => {
  const rows = await db('previous_term_balance as pb')
    .join('students as s', 's.id', 'pb.student_id')
    .where('pb.to_term_id', req.params.toTermId)
    .select('pb.*', 's.first_name', 's.last_name', 's.admission_no');
  res.json({ success: true, data: rows });
});

router.put('/carryover/:studentId/:toTermId', requireRole('admin', 'developer', 'bursar'), async (req, res) => {
  const { studentId, toTermId } = req.params;
  const { balanceAmount, fromTermId } = req.body;
  const existing = await db('previous_term_balance').where({ student_id: studentId, to_term_id: toTermId }).first();
  if (existing) {
    await db('previous_term_balance').where({ id: existing.id }).update({ balance_amount: balanceAmount, from_term_id: fromTermId, updated_at: db.fn.now() });
  } else {
    await db('previous_term_balance').insert({ student_id: studentId, from_term_id: fromTermId, to_term_id: toTermId, balance_amount: balanceAmount });
  }
  res.json({ success: true, data: null });
});

router.delete('/carryover/:id', requireRole('admin', 'developer'), async (req, res) => {
  await db('previous_term_balance').where({ id: req.params.id }).del();
  res.json({ success: true, data: null });
});

// ---- Payment accounts ----
router.get('/payment-accounts', async (req, res) => {
  res.json({ success: true, data: await db('payment_accounts').where({ school_id: req.user.school_id }) });
});

router.post('/payment-accounts', requireRole('admin', 'developer'), async (req, res) => {
  const [id] = await db('payment_accounts').insert({ school_id: req.user.school_id, ...req.body });
  res.status(201).json({ success: true, data: await db('payment_accounts').where({ id }).first() });
});

// ---- Ledger ----
router.get('/ledger/:studentId/:termId', async (req, res) => {
  const ledger = await getStudentLedger(db, req.params.studentId, req.params.termId);
  res.json({ success: true, data: ledger });
});

// ---- Payments ----
const paymentSchema = z.object({
  student_id: z.number().int().positive(),
  term_id: z.number().int().positive(),
  amount: z.number().positive('Amount must be greater than zero'),
  method: z.enum(['cash', 'bank', 'transfer', 'card']),
  reference: z.string().optional(),
  payment_account_id: z.number().int().positive().optional()
});

router.post('/payments', requireRole('admin', 'developer', 'bursar'), validate(paymentSchema), async (req, res) => {
  let receiptNo;
  try {
    receiptNo = await nextInSequence(db, req.user.school_id, 'receipt_no');
  } catch {
    receiptNo = `RCP-${Date.now()}`; // falls back if the school hasn't configured a receipt sequence yet
  }
  const [id] = await db('payments').insert({
    ...req.validated,
    received_by_staff_id: req.user.staff_id, // null if this login has no linked staff record — the column allows it
    receipt_no: receiptNo
  });
  res.status(201).json({ success: true, data: await db('payments').where({ id }).first() });
});

router.get('/payments/:studentId', async (req, res) => {
  const rows = await db('payments').where({ student_id: req.params.studentId }).whereNull('reversed_at').orderBy('created_at', 'desc');
  res.json({ success: true, data: rows });
});

// Void, never delete — reversal is logged with who and why.
router.post('/payments/:id/reverse', requireRole('admin', 'developer'), async (req, res) => {
  await db('payments').where({ id: req.params.id }).update({
    reversed_at: db.fn.now(),
    reversed_by_staff_id: req.user.staff_id,
    reversal_reason: req.body.reason || null
  });
  res.json({ success: true, data: await db('payments').where({ id: req.params.id }).first() });
});

// ---- Reports ----
router.get('/reports/defaulters/:termId', async (req, res) => {
  const students = await db('student_terms as st')
    .join('students as s', 's.id', 'st.student_id')
    .where('st.term_id', req.params.termId)
    .andWhere('s.school_id', req.user.school_id)
    .select('s.id', 's.first_name', 's.last_name', 's.admission_no');

  const results = [];
  for (const student of students) {
    const ledger = await getStudentLedger(db, student.id, req.params.termId);
    if (ledger.totalBalance > 0) results.push({ ...student, balance: ledger.totalBalance });
  }
  res.json({ success: true, data: results.sort((a, b) => b.balance - a.balance) });
});

export default router;
