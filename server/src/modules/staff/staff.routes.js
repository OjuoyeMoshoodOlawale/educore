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
  const staff = await db('staff').where({ school_id: req.user.school_id }).orderBy('first_name');
  res.json({ success: true, data: staff });
});

const staffSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  other_name: z.string().optional(),
  sex: z.string().optional(),
  date_of_birth: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  staff_type: z.string().min(1, 'Staff type is required'),
  qualification: z.string().optional(),
  institution: z.string().optional(),
  graduated_year: z.string().optional()
});

// Staff number is never client-supplied — always drawn from the school's configured sequence.
router.post('/', requireRole('admin', 'developer'), validate(staffSchema), async (req, res) => {
  const staffNo = await nextInSequence(db, req.user.school_id, 'staff_no');
  const [id] = await db('staff').insert({ school_id: req.user.school_id, staff_no: staffNo, ...req.validated });
  res.status(201).json({ success: true, data: await db('staff').where({ id }).first() });
});

router.put('/:id', requirePermission('staff.edit'), validate(staffSchema), async (req, res) => {
  await db('staff').where({ id: req.params.id }).update({ ...req.validated, updated_at: db.fn.now() });
  res.json({ success: true, data: await db('staff').where({ id: req.params.id }).first() });
});

// ---- Allocation (per term; multiple subject teachers per class-subject supported) ----
router.get('/allocation/:termId', async (req, res) => {
  const [classTeachers, subjectTeachers] = await Promise.all([
    db('class_teacher_assignments as cta')
      .join('classes as c', 'c.id', 'cta.class_id')
      .join('staff as s', 's.id', 'cta.staff_id')
      .where('cta.term_id', req.params.termId)
      .select('cta.id', 'cta.class_id', 'c.name as class_name', 'cta.staff_id', 's.first_name', 's.last_name'),
    db('subject_teacher_assignments as sta')
      .join('subjects as subj', 'subj.id', 'sta.subject_id')
      .join('classes as c', 'c.id', 'sta.class_id')
      .join('staff as s', 's.id', 'sta.staff_id')
      .where('sta.term_id', req.params.termId)
      .select('sta.id', 'sta.subject_id', 'subj.name as subject_name', 'sta.class_id', 'c.name as class_name', 'sta.staff_id', 's.first_name', 's.last_name')
  ]);
  res.json({ success: true, data: { classTeachers, subjectTeachers } });
});

router.post('/allocation/class-teacher', requireRole('admin', 'developer'), async (req, res) => {
  const { term_id, class_id, staff_id } = req.body;
  await db('class_teacher_assignments').insert({ term_id, class_id, staff_id }).onConflict(['term_id', 'class_id', 'staff_id']).ignore();
  res.status(201).json({ success: true, data: null });
});

// Multiple teachers per class-subject: this is a plain insert, not an upsert-replace —
// adding a second teacher to the same (term, class, subject) is a normal, supported call.
router.post('/allocation/subject-teacher', requireRole('admin', 'developer'), async (req, res) => {
  const { term_id, class_id, subject_id, staff_id } = req.body;
  await db('subject_teacher_assignments').insert({ term_id, class_id, subject_id, staff_id }).onConflict(['term_id', 'class_id', 'subject_id', 'staff_id']).ignore();
  res.status(201).json({ success: true, data: null });
});

router.delete('/allocation/subject-teacher/:id', requireRole('admin', 'developer'), async (req, res) => {
  await db('subject_teacher_assignments').where({ id: req.params.id }).del();
  res.json({ success: true, data: null });
});

export default router;
