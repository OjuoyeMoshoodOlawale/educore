import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../../config/db.js';
import { getStudentSubjectScores, getClassRanking, getCumulativeAverage } from '../results/results.service.js';

const router = Router();

// Guards against brute-forcing admission numbers — engineering-design.md §3 flags this endpoint
// specifically as worth throttling, the same way a login endpoint would be.
const resultCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { success: false, message: 'Too many attempts — please try again in a few minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

// One field, one click — no scratch-card serial number (plan.md §6). Fee/other blocking is
// explicit via is_result_blocked/block_reason, never a silently-missing second code.
router.post('/result-check', resultCheckLimiter, async (req, res) => {
  const { admissionNo } = req.body;
  if (!admissionNo) return res.status(422).json({ success: false, errors: [{ field: 'admissionNo', message: 'Enter an admission number' }] });

  const student = await db('students').where({ admission_no: admissionNo }).first();
  if (!student) {
    return res.status(404).json({ success: false, message: "We couldn't find a result for that admission number" });
  }

  if (student.is_result_blocked) {
    return res.status(403).json({ success: false, message: 'Please contact the school office', blocked: true });
  }

  // Current enrollment = the term flagged is_current, joined through student_terms.
  const enrollment = await db('student_terms as st')
    .join('terms as t', 't.id', 'st.term_id')
    .where({ 'st.student_id': student.id, 't.is_current': true })
    .select('st.*')
    .first();

  if (!enrollment) {
    return res.status(404).json({ success: false, message: 'No result available for the current term yet' });
  }

  const publication = await db('term_class_publications').where({ term_id: enrollment.term_id, class_id: enrollment.class_id }).first();
  if (!publication?.is_published) {
    return res.status(404).json({ success: false, message: "This term's results haven't been published yet" });
  }

  const [scores, remark, ranking, cumulativeAverage] = await Promise.all([
    getStudentSubjectScores(db, student.id, enrollment.term_id),
    db('student_term_remarks').where({ student_id: student.id, term_id: enrollment.term_id }).first(),
    getClassRanking(db, enrollment.class_id, enrollment.term_id),
    getCumulativeAverage(db, student.id, enrollment.term_id)
  ]);

  const overallPosition = ranking.overall.find((r) => r.studentId === student.id);
  const scoresWithPosition = scores.map((s) => {
    const subjectRanking = ranking.bySubject[s.subject_id] || [];
    const pos = subjectRanking.find((r) => r.studentId === student.id);
    return { ...s, position: pos ? `${pos.position} of ${subjectRanking.length}` : null };
  });

  res.json({
    success: true,
    data: {
      student: { first_name: student.first_name, last_name: student.last_name, admission_no: student.admission_no },
      scores: scoresWithPosition,
      remark,
      overallPosition: overallPosition ? `${overallPosition.position} of ${ranking.classSize}` : null,
      termAverage: overallPosition?.average ?? null,
      cumulativeAverage
    }
  });
});

export default router;
