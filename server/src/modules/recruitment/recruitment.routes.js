import { Router } from 'express';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { nextInSequence } from '../../helpers/numberSequence.js';

const router = Router();

// ---- Job postings ----
router.get('/postings', requireAuth, async (req, res) => {
  res.json({ success: true, data: await db('job_postings').where({ school_id: req.user.school_id }).orderBy('posted_at', 'desc') });
});

router.post('/postings', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  const { title, description, department } = req.body;
  const [id] = await db('job_postings').insert({ school_id: req.user.school_id, title, description, department });
  res.status(201).json({ success: true, data: await db('job_postings').where({ id }).first() });
});

router.post('/postings/:id/close', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  await db('job_postings').where({ id: req.params.id }).update({ status: 'closed', updated_at: db.fn.now() });
  res.json({ success: true, data: null });
});

// Public — no auth. A job posting's application form is meant to be reachable by anyone applying.
router.get('/postings/:id/public', async (req, res) => {
  const posting = await db('job_postings').where({ id: req.params.id, status: 'open' }).first();
  if (!posting) return res.status(404).json({ success: false, message: 'This posting is no longer open' });
  res.json({ success: true, data: posting });
});

router.post('/postings/:id/apply', async (req, res) => {
  const { name, email, phone, cover_note } = req.body;
  if (!name) return res.status(422).json({ success: false, errors: [{ field: 'name', message: 'Name is required' }] });
  const [id] = await db('applicants').insert({ job_posting_id: req.params.id, name, email, phone, cover_note });
  await db('application_stages').insert({ applicant_id: id, stage: 'applied' });
  res.status(201).json({ success: true, data: { id } });
});

// ---- Applicants / pipeline ----
router.get('/postings/:id/applicants', requireAuth, async (req, res) => {
  const applicants = await db('applicants').where({ job_posting_id: req.params.id }).orderBy('created_at', 'desc');
  res.json({ success: true, data: applicants });
});

const STAGES = ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'];

router.post('/applicants/:id/move', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  const { stage, notes } = req.body;
  if (!STAGES.includes(stage)) return res.status(422).json({ success: false, errors: [{ field: 'stage', message: 'Not a valid pipeline stage' }] });

  await db('applicants').where({ id: req.params.id }).update({ current_stage: stage, updated_at: db.fn.now() });
  await db('application_stages').insert({ applicant_id: req.params.id, stage, notes, moved_by_staff_id: req.user.staff_id });
  res.json({ success: true, data: null });
});

router.get('/applicants/:id/history', requireAuth, async (req, res) => {
  const history = await db('application_stages').where({ applicant_id: req.params.id }).orderBy('moved_at');
  res.json({ success: true, data: history });
});

// One-click "create staff profile from this applicant" — closes the loop between recruitment
// and the staff module instead of leaving them disconnected (platform-addendum.md §8).
router.post('/applicants/:id/hire-to-staff', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  const applicant = await db('applicants').where({ id: req.params.id }).first();
  if (!applicant) return res.status(404).json({ success: false, message: 'Applicant not found' });

  const [nameParts, ...rest] = [applicant.name.split(' ')];
  const firstName = nameParts[0] || applicant.name;
  const lastName = nameParts.slice(1).join(' ') || '\u2014';

  const staffNo = await nextInSequence(db, req.user.school_id, 'staff_no');
  const [staffId] = await db('staff').insert({
    school_id: req.user.school_id,
    staff_no: staffNo,
    first_name: firstName,
    last_name: lastName,
    email: applicant.email,
    phone: applicant.phone,
    staff_type: (await db('job_postings').where({ id: applicant.job_posting_id }).first())?.department || null
  });

  await db('applicants').where({ id: applicant.id }).update({ current_stage: 'hired', updated_at: db.fn.now() });
  await db('application_stages').insert({ applicant_id: applicant.id, stage: 'hired', notes: `Staff profile created: ${staffNo}`, moved_by_staff_id: req.user.staff_id });

  res.json({ success: true, data: await db('staff').where({ id: staffId }).first() });
});

// ---- Interviews ----
router.post('/applicants/:id/interview', requireAuth, requireRole('admin', 'developer'), async (req, res) => {
  const { scheduled_at, interviewer_staff_id, location_or_link } = req.body;
  const [id] = await db('interview_schedule').insert({ applicant_id: req.params.id, scheduled_at, interviewer_staff_id, location_or_link });
  res.status(201).json({ success: true, data: await db('interview_schedule').where({ id }).first() });
});

router.get('/applicants/:id/interviews', requireAuth, async (req, res) => {
  res.json({ success: true, data: await db('interview_schedule').where({ applicant_id: req.params.id }).orderBy('scheduled_at') });
});

export default router;
