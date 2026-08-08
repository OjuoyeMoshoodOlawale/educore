import { Router } from 'express';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Students currently active in a given class/term — the pool an admin picks from to promote or graduate.
router.get('/students/:classId/:termId', async (req, res) => {
  const { classId, termId } = req.params;
  const students = await db('student_terms as st')
    .join('students as s', 's.id', 'st.student_id')
    .where({ 'st.class_id': classId, 'st.term_id': termId, 'st.status': 'active' })
    .select('s.id', 's.first_name', 's.last_name', 's.admission_no');
  res.json({ success: true, data: students });
});

// Promotion is append-only (plan.md §2.3 / §6): a NEW student_terms row for the target term,
// never an edit of the old one. Idempotent — a student already promoted to the target term is
// skipped, not double-inserted, so re-running this for the same target is always safe.
router.post('/promote', requireRole('admin', 'developer'), async (req, res) => {
  const { studentIds, toClassId, toTermId } = req.body;
  let promoted = 0;
  let skipped = 0;

  for (const studentId of studentIds) {
    const existing = await db('student_terms').where({ student_id: studentId, term_id: toTermId }).first();
    if (existing) {
      skipped++;
      continue;
    }
    await db('student_terms').insert({
      student_id: studentId,
      term_id: toTermId,
      class_id: toClassId,
      status: 'active',
      intake_type: 'returning'
    });
    promoted++;
  }

  res.json({ success: true, data: { promoted, skipped } });
});

// Graduation is terminal — updates the student's CURRENT student_terms row to 'graduated',
// no new row created (unlike promotion). Historical scores/payments are untouched.
router.post('/graduate', requireRole('admin', 'developer'), async (req, res) => {
  const { studentIds, termId } = req.body;
  await db('student_terms').where({ term_id: termId }).whereIn('student_id', studentIds).update({ status: 'graduated', updated_at: db.fn.now() });
  res.json({ success: true, data: { graduated: studentIds.length } });
});

export default router;
