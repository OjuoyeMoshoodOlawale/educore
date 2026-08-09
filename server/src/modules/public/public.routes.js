import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../../config/db.js';
import { getStudentSubjectScores, getClassRanking, getCumulativeAverage } from '../results/results.service.js';
import { getStudentLedger } from '../fees/fees.service.js';

const router = Router();

// Guards against brute-forcing admission numbers — engineering-design.md §3 flags this endpoint
// specifically as worth throttling, the same way a login endpoint would be.
const portalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { success: false, message: 'Too many attempts — please try again in a few minutes' },
  standardHeaders: true,
  legacyHeaders: false
});

// One field, one click — no scratch-card serial number (plan.md §6). Combines fees + results,
// since a parent's most common two questions are "what do I owe" and "how did they do."
//
// A blocked student still shows their fee balance — the whole point of a fee-related block is
// usually for the parent to see what's owed and pay it, so hiding the balance would defeat the
// block's own purpose. Only the results section is withheld when blocked.
router.post('/portal', portalLimiter, async (req, res) => {
  const { admissionNo } = req.body;
  if (!admissionNo) return res.status(422).json({ success: false, errors: [{ field: 'admissionNo', message: 'Enter an admission number' }] });

  const student = await db('students').where({ admission_no: admissionNo }).first();
  if (!student) {
    return res.status(404).json({ success: false, message: "We couldn't find a student with that admission number" });
  }

  const enrollment = await db('student_terms as st')
    .join('terms as t', 't.id', 'st.term_id')
    .where({ 'st.student_id': student.id, 't.is_current': true })
    .select('st.*', 't.id as current_term_id')
    .first();

  const studentInfo = { first_name: student.first_name, last_name: student.last_name, admission_no: student.admission_no };

  if (!enrollment) {
    return res.json({ success: true, data: { student: studentInfo, fees: null, results: null, resultsStatus: 'no_current_enrollment' } });
  }

  const fees = await getStudentLedger(db, student.id, enrollment.current_term_id);

  if (student.is_result_blocked) {
    return res.json({ success: true, data: { student: studentInfo, fees, results: null, resultsStatus: 'blocked' } });
  }

  const publication = await db('term_class_publications').where({ term_id: enrollment.current_term_id, class_id: enrollment.class_id }).first();
  if (!publication?.is_published) {
    return res.json({ success: true, data: { student: studentInfo, fees, results: null, resultsStatus: 'not_published' } });
  }

  const [scores, remark, ranking, cumulativeAverage] = await Promise.all([
    getStudentSubjectScores(db, student.id, enrollment.current_term_id),
    db('student_term_remarks').where({ student_id: student.id, term_id: enrollment.current_term_id }).first(),
    getClassRanking(db, enrollment.class_id, enrollment.current_term_id),
    getCumulativeAverage(db, student.id, enrollment.current_term_id)
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
      student: studentInfo,
      fees,
      results: {
        scores: scoresWithPosition,
        remark,
        overallPosition: overallPosition ? `${overallPosition.position} of ${ranking.classSize}` : null,
        termAverage: overallPosition?.average ?? null,
        cumulativeAverage
      },
      resultsStatus: 'available'
    }
  });
});

export default router;
