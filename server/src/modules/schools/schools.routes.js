import { Router } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { validate } from '../../helpers/validate.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { SEQUENCE_PRESETS } from '../../helpers/numberSequence.js';

const router = Router();
router.use(requireAuth);

// ---- School profile ----
router.get('/profile', async (req, res) => {
  const school = await db('schools').where({ id: req.user.school_id }).first();
  res.json({ success: true, data: school });
});

const profileSchema = z.object({
  name: z.string().min(1, 'School name is required'),
  motto: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  website: z.string().optional()
});

router.put('/profile', requireRole('admin', 'developer'), validate(profileSchema), async (req, res) => {
  await db('schools').where({ id: req.user.school_id }).update({ ...req.validated, updated_at: db.fn.now() });
  const school = await db('schools').where({ id: req.user.school_id }).first();
  res.json({ success: true, data: school });
});

// ---- Sessions & terms (collapsible, lazy-loaded — SchoolFees Manager pattern) ----
router.get('/sessions', async (req, res) => {
  const sessions = await db('sessions').where({ school_id: req.user.school_id }).orderBy('name', 'desc');
  res.json({ success: true, data: sessions });
});

router.get('/sessions/:id/terms', async (req, res) => {
  const terms = await db('terms').where({ session_id: req.params.id }).orderBy('id');
  res.json({ success: true, data: terms });
});

const sessionSchema = z.object({
  name: z.string().regex(/^\d{4}\/\d{4}$/, 'Use the format YYYY/YYYY, e.g. 2025/2026')
});

// Creating a session auto-creates its three terms — one action instead of four.
router.post('/sessions', requireRole('admin', 'developer'), validate(sessionSchema), async (req, res) => {
  const [id] = await db('sessions').insert({ school_id: req.user.school_id, name: req.validated.name });
  const termNames = ['First term', 'Second term', 'Third term'];
  await db('terms').insert(termNames.map((name) => ({ session_id: id, name })));
  const session = await db('sessions').where({ id }).first();
  res.status(201).json({ success: true, data: session });
});

router.put('/terms/:id', requireRole('admin', 'developer'), async (req, res) => {
  const { opens_on, closes_on, holiday_count, next_term_begins } = req.body;
  await db('terms').where({ id: req.params.id }).update({ opens_on, closes_on, holiday_count, next_term_begins, updated_at: db.fn.now() });
  const term = await db('terms').where({ id: req.params.id }).first();
  res.json({ success: true, data: term });
});

// Single "current term" pivot — setting one clears any other current term in the school.
router.post('/terms/:id/set-current', requireRole('admin', 'developer'), async (req, res) => {
  await db.transaction(async (trx) => {
    const term = await trx('terms').where({ id: req.params.id }).first();
    const sessionIds = await trx('sessions').where({ school_id: req.user.school_id }).pluck('id');
    await trx('terms').whereIn('session_id', sessionIds).update({ is_current: false });
    await trx('terms').where({ id: term.id }).update({ is_current: true });
  });
  res.json({ success: true, data: null });
});

// ---- Sections & classes (drag-to-reorder) ----
router.get('/sections', async (req, res) => {
  const sections = await db('school_sections').where({ school_id: req.user.school_id }).orderBy('display_order');
  res.json({ success: true, data: sections });
});

router.post('/sections', requireRole('admin', 'developer'), async (req, res) => {
  const maxOrder = await db('school_sections').where({ school_id: req.user.school_id }).max('display_order as m').first();
  const [id] = await db('school_sections').insert({
    school_id: req.user.school_id,
    name: req.body.name,
    display_order: (maxOrder?.m ?? 0) + 1
  });
  res.status(201).json({ success: true, data: await db('school_sections').where({ id }).first() });
});

// Reorder endpoint: one array of ids in their new order, re-numbered in one transaction.
router.put('/sections/reorder', requireRole('admin', 'developer'), async (req, res) => {
  const { orderedIds } = req.body;
  await db.transaction(async (trx) => {
    await Promise.all(orderedIds.map((id, index) => trx('school_sections').where({ id }).update({ display_order: index })));
  });
  res.json({ success: true, data: null });
});

router.get('/classes', async (req, res) => {
  const classes = await db('classes').where({ school_id: req.user.school_id }).orderBy('display_order');
  res.json({ success: true, data: classes });
});

router.post('/classes', requireRole('admin', 'developer'), async (req, res) => {
  const maxOrder = await db('classes').where({ section_id: req.body.section_id }).max('display_order as m').first();
  const [id] = await db('classes').insert({
    school_id: req.user.school_id,
    section_id: req.body.section_id,
    name: req.body.name,
    display_order: (maxOrder?.m ?? 0) + 1
  });
  res.status(201).json({ success: true, data: await db('classes').where({ id }).first() });
});

router.put('/classes/reorder', requireRole('admin', 'developer'), async (req, res) => {
  const { orderedIds } = req.body;
  await db.transaction(async (trx) => {
    await Promise.all(orderedIds.map((id, index) => trx('classes').where({ id }).update({ display_order: index })));
  });
  res.json({ success: true, data: null });
});

// ---- Subjects ----
router.get('/subjects', async (req, res) => {
  const subjects = await db('subjects').where({ school_id: req.user.school_id }).orderBy('name');
  res.json({ success: true, data: subjects });
});

const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required'),
  code: z.string().optional(),
  is_core: z.boolean().optional(),
  ca1_max: z.number().int().positive(),
  ca2_max: z.number().int().positive(),
  exam_max: z.number().int().positive()
});

router.post('/subjects', requireRole('admin', 'developer'), validate(subjectSchema), async (req, res) => {
  const [id] = await db('subjects').insert({ school_id: req.user.school_id, section_id: req.body.section_id, ...req.validated });
  res.status(201).json({ success: true, data: await db('subjects').where({ id }).first() });
});

router.put('/subjects/:id', requireRole('admin', 'developer'), validate(subjectSchema), async (req, res) => {
  await db('subjects').where({ id: req.params.id }).update({ ...req.validated, updated_at: db.fn.now() });
  res.json({ success: true, data: await db('subjects').where({ id: req.params.id }).first() });
});

// ---- Grading scale ----
router.get('/grading-scale', async (req, res) => {
  const [gradeBoundaries, ratingKeys] = await Promise.all([
    db('grade_boundaries').where({ school_id: req.user.school_id }).orderBy('min_score', 'desc'),
    db('rating_keys').where({ school_id: req.user.school_id }).orderBy('key_value', 'desc')
  ]);
  res.json({ success: true, data: { gradeBoundaries, ratingKeys } });
});

// ---- Number sequences ----
router.get('/number-sequences', async (req, res) => {
  const sequences = await db('number_sequences').where({ school_id: req.user.school_id });
  res.json({ success: true, data: { sequences, presets: SEQUENCE_PRESETS } });
});

router.put('/number-sequences/:id', requireRole('admin', 'developer'), async (req, res) => {
  const { format, prefix, reset_period } = req.body;
  await db('number_sequences').where({ id: req.params.id }).update({ format, prefix, reset_period, updated_at: db.fn.now() });
  res.json({ success: true, data: await db('number_sequences').where({ id: req.params.id }).first() });
});

export default router;
