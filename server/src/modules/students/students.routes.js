import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { validate } from '../../helpers/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/permissions.js';
import { nextInSequence } from '../../helpers/numberSequence.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { classId, termId } = req.query;
  let query = db('students as s')
    .where('s.school_id', req.user.school_id)
    .select('s.*');

  if (classId && termId) {
    query = query
      .join('student_terms as st', function () {
        this.on('st.student_id', 's.id').andOn('st.term_id', db.raw('?', [termId]));
      })
      .where('st.class_id', classId)
      .select('s.*', 'st.status', 'st.class_id');
  }

  const students = await query.orderBy('s.first_name');
  res.json({ success: true, data: students });
});

router.get('/:id', async (req, res) => {
  const student = await db('students').where({ id: req.params.id, school_id: req.user.school_id }).first();
  if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
  const guardians = await db('student_guardians').where({ student_id: student.id });
  res.json({ success: true, data: { ...student, guardians } });
});

const studentSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  other_name: z.string().optional(),
  sex: z.string().optional(),
  date_of_birth: z.string().optional(),
  boarding_type: z.enum(['day', 'boarder']).optional(),
  address: z.string().optional(),
  occupation: z.string().optional(),
  class_id: z.number().int().positive(),
  term_id: z.number().int().positive(),
  intake_type: z.enum(['new', 'returning']).optional(),
  guardians: z
    .array(
      z.object({
        name: z.string().min(1, "Guardian's name is required"),
        relationship: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        is_primary: z.boolean().optional()
      })
    )
    .optional()
});

// Admission number is always drawn from the school's configured sequence — never client-supplied.
router.post('/', requireRole('admin', 'developer', 'bursar'), validate(studentSchema), async (req, res) => {
  const { class_id, term_id, intake_type, guardians, ...profile } = req.validated;
  const admissionNo = await nextInSequence(db, req.user.school_id, 'admission_no');

  const result = await db.transaction(async (trx) => {
    const [id] = await trx('students').insert({ school_id: req.user.school_id, admission_no: admissionNo, ...profile });
    await trx('student_terms').insert({ student_id: id, term_id, class_id, intake_type: intake_type || 'new' });
    if (guardians?.length) {
      await trx('student_guardians').insert(guardians.map((g) => ({ student_id: id, ...g })));
    }
    return trx('students').where({ id }).first();
  });

  res.status(201).json({ success: true, data: result });
});

router.put('/:id', requirePermission('students.edit'), validate(studentSchema.partial()), async (req, res) => {
  const { class_id, term_id, intake_type, guardians, ...profile } = req.validated;
  await db('students').where({ id: req.params.id }).update({ ...profile, updated_at: db.fn.now() });
  res.json({ success: true, data: await db('students').where({ id: req.params.id }).first() });
});

export default router;
