import { Router } from 'express';
import { db } from '../../config/db.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { saveScore, getStudentSubjectScores, getClassRanking, getCumulativeAverage, suggestComment } from './results.service.js';

const router = Router();
router.use(requireAuth);

// ---- Score entry ----
router.get('/scores/:classId/:subjectId/:termId', async (req, res) => {
  const { classId, subjectId, termId } = req.params;
  const students = await db('student_terms as st')
    .join('students as s', 's.id', 'st.student_id')
    .where({ 'st.class_id': classId, 'st.term_id': termId })
    .select('s.id', 's.first_name', 's.last_name');

  const scores = await db('subject_scores').where({ term_id: termId, subject_id: subjectId }).whereIn('student_id', students.map((s) => s.id));
  const subject = await db('subjects').where({ id: subjectId }).first();

  const data = students.map((s) => ({
    ...s,
    score: scores.find((sc) => sc.student_id === s.id) || null
  }));

  res.json({ success: true, data: { students: data, subject } });
});

router.put('/scores/:studentId/:subjectId/:termId', requireRole('admin', 'developer', 'class_teacher', 'subject_teacher'), async (req, res) => {
  const { studentId, subjectId, termId } = req.params;
  const { ca1, ca2, exam } = req.body;
  const subject = await db('subjects').where({ id: subjectId }).first();

  // Server-side validation against the subject's configured max — never trust the client alone.
  const errors = [];
  if (Number(ca1) > subject.ca1_max) errors.push({ field: 'ca1', message: `CA1 can't exceed ${subject.ca1_max}` });
  if (Number(ca2) > subject.ca2_max) errors.push({ field: 'ca2', message: `CA2 can't exceed ${subject.ca2_max}` });
  if (Number(exam) > subject.exam_max) errors.push({ field: 'exam', message: `Exam can't exceed ${subject.exam_max}` });
  if (errors.length) return res.status(422).json({ success: false, errors });

  const result = await saveScore(db, { studentId, termId, subjectId, ca1, ca2, exam, staffId: req.user.staff_id });
  res.json({ success: true, data: result });
});

// ---- Psychomotor / affective ----
router.get('/traits/:domain', async (req, res) => {
  const traits = await db('trait_definitions').where({ school_id: req.user.school_id, domain: req.params.domain }).orderBy('display_order');
  res.json({ success: true, data: traits });
});

router.get('/traits/:domain/:classId/:termId', async (req, res) => {
  const { domain, classId, termId } = req.params;
  const [students, traits, ratingKeys] = await Promise.all([
    db('student_terms as st').join('students as s', 's.id', 'st.student_id').where({ 'st.class_id': classId, 'st.term_id': termId }).select('s.id', 's.first_name', 's.last_name'),
    db('trait_definitions').where({ school_id: req.user.school_id, domain }).orderBy('display_order'),
    db('rating_keys').where({ school_id: req.user.school_id }).orderBy('key_value', 'desc')
  ]);
  const scores = await db('trait_scores').where({ term_id: termId }).whereIn('student_id', students.map((s) => s.id));
  res.json({ success: true, data: { students, traits, ratingKeys, scores } });
});

router.put('/traits/:studentId/:traitDefinitionId/:termId', requireRole('admin', 'developer', 'class_teacher', 'subject_teacher'), async (req, res) => {
  const { studentId, traitDefinitionId, termId } = req.params;
  const { ratingKeyId } = req.body;
  const existing = await db('trait_scores').where({ student_id: studentId, term_id: termId, trait_definition_id: traitDefinitionId }).first();
  if (existing) {
    await db('trait_scores').where({ id: existing.id }).update({ rating_key_id: ratingKeyId, updated_at: db.fn.now() });
  } else {
    await db('trait_scores').insert({ student_id: studentId, term_id: termId, trait_definition_id: traitDefinitionId, rating_key_id: ratingKeyId });
  }
  res.json({ success: true, data: null });
});

// ---- Attendance & comments (with auto-suggested drafts) ----
router.get('/remarks/:studentId/:termId', async (req, res) => {
  const { studentId, termId } = req.params;
  const student = await db('students').where({ id: studentId }).first();
  let remark = await db('student_term_remarks').where({ student_id: studentId, term_id: termId }).first();

  const average = await getCumulativeAverage(db, studentId, termId);
  const teacherDraft = !remark?.teacher_comment ? await suggestComment(db, student.school_id, 'teacher', average) : null;
  const principalDraft = !remark?.principal_comment ? await suggestComment(db, student.school_id, 'principal', average) : null;

  res.json({ success: true, data: { remark, termAverage: average, teacherDraft, principalDraft } });
});

router.put('/remarks/:studentId/:termId', requireRole('admin', 'developer', 'class_teacher'), async (req, res) => {
  const { studentId, termId } = req.params;
  const { days_present, days_absent, times_school_opened, teacher_comment } = req.body;
  const existing = await db('student_term_remarks').where({ student_id: studentId, term_id: termId }).first();
  const row = {
    days_present, days_absent, times_school_opened, teacher_comment,
    teacher_id: req.user.staff_id, teacher_commented_at: db.fn.now()
  };
  if (existing) await db('student_term_remarks').where({ id: existing.id }).update({ ...row, updated_at: db.fn.now() });
  else await db('student_term_remarks').insert({ student_id: studentId, term_id: termId, ...row });
  res.json({ success: true, data: null });
});

// Principal's comment is a separate write path/role — never bundled with the teacher's.
router.put('/remarks/:studentId/:termId/principal', requireRole('admin', 'developer', 'principal'), async (req, res) => {
  const { studentId, termId } = req.params;
  const existing = await db('student_term_remarks').where({ student_id: studentId, term_id: termId }).first();
  const row = { principal_comment: req.body.principal_comment, principal_id: req.user.staff_id, principal_commented_at: db.fn.now() };
  if (existing) await db('student_term_remarks').where({ id: existing.id }).update({ ...row, updated_at: db.fn.now() });
  else await db('student_term_remarks').insert({ student_id: studentId, term_id: termId, ...row });
  res.json({ success: true, data: null });
});

// ---- Report card ----
router.get('/report-card/:studentId/:termId', async (req, res) => {
  const { studentId, termId } = req.params;
  const student = await db('students').where({ id: studentId }).first();
  const enrollment = await db('student_terms').where({ student_id: studentId, term_id: termId }).first();

  const [scores, remark, traitScores, traitDefs, ratingKeys, ranking, cumulativeAverage] = await Promise.all([
    getStudentSubjectScores(db, studentId, termId),
    db('student_term_remarks').where({ student_id: studentId, term_id: termId }).first(),
    db('trait_scores').where({ student_id: studentId, term_id: termId }),
    db('trait_definitions').where({ school_id: student.school_id }),
    db('rating_keys').where({ school_id: student.school_id }),
    enrollment ? getClassRanking(db, enrollment.class_id, termId) : { overall: [], bySubject: {} },
    getCumulativeAverage(db, studentId, termId)
  ]);

  const overallPosition = ranking.overall.find((r) => r.studentId === Number(studentId));
  const scoresWithPosition = scores.map((s) => {
    const subjectRanking = ranking.bySubject[s.subject_id] || [];
    const pos = subjectRanking.find((r) => r.studentId === Number(studentId));
    return { ...s, position: pos ? `${pos.position} of ${subjectRanking.length}` : null };
  });

  const traits = traitDefs.map((td) => ({
    ...td,
    rating: traitScores.find((ts) => ts.trait_definition_id === td.id)?.rating_key_id
  }));

  res.json({
    success: true,
    data: {
      student,
      scores: scoresWithPosition,
      remark,
      traits,
      ratingKeys,
      classSize: ranking.classSize || 0,
      overallPosition: overallPosition ? `${overallPosition.position} of ${ranking.classSize}` : null,
      termAverage: overallPosition?.average ?? null,
      cumulativeAverage
    }
  });
});

// ---- Broadsheet ----
router.get('/broadsheet/:classId/:termId', async (req, res) => {
  const { classId, termId } = req.params;
  const students = await db('student_terms as st').join('students as s', 's.id', 'st.student_id').where({ 'st.class_id': classId, 'st.term_id': termId }).select('s.id', 's.first_name', 's.last_name');
  const subjectIds = await db('subject_scores').where({ term_id: termId }).whereIn('student_id', students.map((s) => s.id)).distinct('subject_id').pluck('subject_id');
  const subjects = await db('subjects').whereIn('id', subjectIds);
  const scores = await db('subject_scores').where({ term_id: termId }).whereIn('student_id', students.map((s) => s.id));
  const ranking = await getClassRanking(db, classId, termId);

  const grid = students.map((s) => {
    const row = { student: s, bySubject: {}, average: null, position: null };
    for (const subj of subjects) {
      const score = scores.find((sc) => sc.student_id === s.id && sc.subject_id === subj.id);
      row.bySubject[subj.id] = score || null;
    }
    const overall = ranking.overall.find((r) => r.studentId === s.id);
    row.average = overall?.average ?? null;
    row.position = overall ? `${overall.position} of ${ranking.classSize}` : null;
    return row;
  });

  res.json({ success: true, data: { subjects, grid } });
});

// ---- Publish (per class, not term-wide) ----
router.get('/publish/:termId', async (req, res) => {
  const classes = await db('classes').where({ school_id: req.user.school_id }).orderBy('display_order');
  const publications = await db('term_class_publications').where({ term_id: req.params.termId });
  const data = classes.map((c) => ({ ...c, publication: publications.find((p) => p.class_id === c.id) || null }));
  res.json({ success: true, data });
});

router.post('/publish/:classId/:termId', requireRole('admin', 'developer', 'principal'), async (req, res) => {
  const { classId, termId } = req.params;
  const existing = await db('term_class_publications').where({ class_id: classId, term_id: termId }).first();
  const row = { is_published: true, published_at: db.fn.now(), published_by_staff_id: req.user.staff_id };
  if (existing) await db('term_class_publications').where({ id: existing.id }).update({ ...row, updated_at: db.fn.now() });
  else await db('term_class_publications').insert({ class_id: classId, term_id: termId, ...row });
  res.json({ success: true, data: null });
});

router.post('/unpublish/:classId/:termId', requireRole('admin', 'developer', 'principal'), async (req, res) => {
  await db('term_class_publications').where({ class_id: req.params.classId, term_id: req.params.termId }).update({ is_published: false, updated_at: db.fn.now() });
  res.json({ success: true, data: null });
});

export default router;
