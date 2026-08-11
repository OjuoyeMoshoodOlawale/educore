// The one shared ranking/averaging function — per plan.md §2.1, the legacy system had four
// slightly-different copies of this across report card/broadsheet files. Build it once here,
// used by both the report card and broadsheet routes below.
//
// termAverages: array of numbers-or-null, in chronological term order (whichever terms the
// student actually has data for; a term the student wasn't enrolled in is simply absent, not 0).
export function computeCumulativeAverage(termAverages) {
  const present = termAverages.filter((v) => v !== null && v !== undefined);
  if (!present.length) return null;
  return present.reduce((sum, v) => sum + v, 0) / present.length;
}

// Grade is computed and stored at save time (addendum-v4.md §10.5) — never recalculated later
// against grading-scale settings that may have since changed.
async function lookupGrade(trx, schoolId, total) {
  const match = await trx('grade_boundaries')
    .where({ school_id: schoolId })
    .andWhere('min_score', '<=', total)
    .andWhere('max_score', '>=', total)
    .first();
  return match ? match.grade_key : null;
}

// A conflict error carries the current row so the caller can show the person what actually
// landed, rather than a generic "please retry" — see addendum-v4.md §9 on live-edit awareness.
export class ScoreConflictError extends Error {
  constructor(currentRow) {
    super('This score was changed by someone else — see the latest value below.');
    this.status = 409;
    this.currentRow = currentRow;
  }
}

export async function saveScore(db, { studentId, termId, subjectId, ca1, ca2, exam, staffId, expectedVersion }) {
  return db.transaction(async (trx) => {
    const subject = await trx('subjects').where({ id: subjectId }).first();
    const student = await trx('students').where({ id: studentId }).first();
    const total = Number(ca1) + Number(ca2) + Number(exam);
    const grade = await lookupGrade(trx, student.school_id, total);

    const existing = await trx('subject_scores').where({ student_id: studentId, term_id: termId, subject_id: subjectId }).first();
    const row = { ca1, ca2, exam, total, computed_grade: grade, entered_by_staff_id: staffId };

    if (existing) {
      // Optimistic lock: only apply if nobody else has saved a version newer than what this
      // teacher last loaded. expectedVersion === undefined means "I never saw a version" (first
      // save this session) — treated as trusting the current state, same as before this feature.
      if (expectedVersion !== undefined && Number(expectedVersion) !== existing.version) {
        throw new ScoreConflictError(existing);
      }
      const updated = await trx('subject_scores')
        .where({ id: existing.id, version: existing.version })
        .update({ ...row, version: existing.version + 1, updated_at: trx.fn.now() });
      if (updated === 0) throw new ScoreConflictError(await trx('subject_scores').where({ id: existing.id }).first());
    } else {
      await trx('subject_scores').insert({ student_id: studentId, term_id: termId, subject_id: subjectId, ...row, version: 1 });
    }
    const saved = await trx('subject_scores').where({ student_id: studentId, term_id: termId, subject_id: subjectId }).first();
    return { total, grade, version: saved.version, subjectMax: { ca1: subject.ca1_max, ca2: subject.ca2_max, exam: subject.exam_max } };
  });
}

// Current term's subject_scores rows always define what a report card shows — per addendum-v4.md
// §10.5, never a static subject list or "ever taken" list. A dropped subject's old data stays in
// the table untouched; it just stops surfacing once there's no current-term row for it.
export async function getStudentSubjectScores(db, studentId, termId) {
  return db('subject_scores as ss')
    .join('subjects as subj', 'subj.id', 'ss.subject_id')
    .where({ 'ss.student_id': studentId, 'ss.term_id': termId })
    .select('ss.*', 'subj.name as subject_name', 'subj.ca1_max', 'subj.ca2_max', 'subj.exam_max');
}

// Per-subject and overall class position for one term — ranked in JS against classmates
// (portable across SQLite/MySQL, and realistic for a single class's headcount).
export async function getClassRanking(db, classId, termId) {
  const enrolled = await db('student_terms').where({ class_id: classId, term_id: termId }).select('student_id');
  const studentIds = enrolled.map((e) => e.student_id);
  if (!studentIds.length) return { overall: [], bySubject: {} };

  const allScores = await db('subject_scores').where({ term_id: termId }).whereIn('student_id', studentIds);

  const overall = studentIds
    .map((id) => {
      const rows = allScores.filter((s) => s.student_id === id);
      const avg = rows.length ? rows.reduce((sum, r) => sum + Number(r.total), 0) / rows.length : null;
      return { studentId: id, average: avg };
    })
    .filter((r) => r.average !== null)
    .sort((a, b) => b.average - a.average)
    .map((r, i) => ({ ...r, position: i + 1 }));

  const bySubject = {};
  const subjectIds = [...new Set(allScores.map((s) => s.subject_id))];
  for (const subjectId of subjectIds) {
    bySubject[subjectId] = allScores
      .filter((s) => s.subject_id === subjectId)
      .sort((a, b) => Number(b.total) - Number(a.total))
      .map((r, i) => ({ studentId: r.student_id, total: Number(r.total), position: i + 1 }));
  }

  return { overall, bySubject, classSize: studentIds.length };
}

// Walks backward through the same session's earlier terms to build the cumulative trend —
// skips terms the student has no record for (see computeCumulativeAverage above), never zeros them.
export async function getCumulativeAverage(db, studentId, termId) {
  const term = await db('terms').where({ id: termId }).first();
  const sessionTerms = await db('terms').where({ session_id: term.session_id }).orderBy('id');
  const upToCurrent = sessionTerms.filter((t) => t.id <= termId);

  const termAverages = [];
  for (const t of upToCurrent) {
    const rows = await db('subject_scores').where({ student_id: studentId, term_id: t.id });
    termAverages.push(rows.length ? rows.reduce((sum, r) => sum + Number(r.total), 0) / rows.length : null);
  }
  return computeCumulativeAverage(termAverages);
}

// Auto-suggested comment draft based on the term average — editable, never saved unreviewed
// (platform-addendum.md §4). Falls back to null if the school hasn't configured templates.
export async function suggestComment(db, schoolId, role, average) {
  if (average === null) return null;
  const template = await db('comment_templates')
    .where({ school_id: schoolId, role })
    .andWhere('min_score', '<=', average)
    .andWhere('max_score', '>=', average)
    .first();
  return template?.draft_text || null;
}
