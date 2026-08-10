import bcrypt from 'bcryptjs';

export async function seed(knex) {
  await knex('interview_schedule').del();
  await knex('application_stages').del();
  await knex('applicants').del();
  await knex('job_postings').del();
  await knex('school_modules').del();
  await knex('previous_term_balance').del();
  await knex('student_bills').del();
  await knex('term_class_publications').del();
  await knex('trait_scores').del();
  await knex('trait_definitions').del();
  await knex('comment_templates').del();
  await knex('student_term_remarks').del();
  await knex('subject_scores').del();
  await knex('notification_log').del();
  await knex('payments').del();
  await knex('payment_accounts').del();
  await knex('fee_adjustments').del();
  await knex('fee_structures').del();
  await knex('fee_items').del();
  await knex('class_teacher_assignments').del();
  await knex('subject_teacher_assignments').del();
  await knex('student_terms').del();
  await knex('student_guardians').del();
  await knex('students').del();
  await knex('users').del();
  await knex('staff').del();
  await knex('number_sequences').del();
  await knex('rating_keys').del();
  await knex('grade_boundaries').del();
  await knex('subjects').del();
  await knex('classes').del();
  await knex('school_sections').del();
  await knex('terms').del();
  await knex('sessions').del();
  await knex('schools').del();

  // ---------------------------------------------------------------- School / calendar
  const [schoolId] = await knex('schools').insert({
    name: 'Al-Minhaaj Model College',
    motto: 'Knowledge and character',
    email: 'info@alminhaaj.edu.ng'
  });

  const [sessionId] = await knex('sessions').insert({ school_id: schoolId, name: '2025/2026', is_active: true });
  await knex('terms').insert([
    { session_id: sessionId, name: 'First term', is_current: false },
    { session_id: sessionId, name: 'Second term', is_current: true },
    { session_id: sessionId, name: 'Third term', is_current: false }
  ]);
  const secondTerm = await knex('terms').where({ session_id: sessionId, name: 'Second term' }).first();

  // ---------------------------------------------------------------- Sections / classes / subjects
  const [secondaryId] = await knex('school_sections').insert({ school_id: schoolId, name: 'Secondary', display_order: 0 });
  await knex('classes').insert([
    { school_id: schoolId, section_id: secondaryId, name: 'JSS 1', display_order: 0 },
    { school_id: schoolId, section_id: secondaryId, name: 'JSS 2', display_order: 1 },
    { school_id: schoolId, section_id: secondaryId, name: 'JSS 3', display_order: 2 }
  ]);
  const jss1 = await knex('classes').where({ school_id: schoolId, name: 'JSS 1' }).first();
  const jss2 = await knex('classes').where({ school_id: schoolId, name: 'JSS 2' }).first();
  const jss3 = await knex('classes').where({ school_id: schoolId, name: 'JSS 3' }).first();

  const subjectDefs = [
    { name: 'Mathematics', code: 'MTH', is_core: true, ca1_max: 20, ca2_max: 20, exam_max: 60 },
    { name: 'English Language', code: 'ENG', is_core: true, ca1_max: 20, ca2_max: 20, exam_max: 60 },
    { name: 'Basic Science', code: 'BSC', is_core: true, ca1_max: 20, ca2_max: 20, exam_max: 60 },
    { name: 'Social Studies', code: 'SOS', is_core: true, ca1_max: 15, ca2_max: 15, exam_max: 70 },
    { name: 'Fine Art', code: 'ART', is_core: false, ca1_max: 10, ca2_max: 10, exam_max: 80 }
  ];
  await knex('subjects').insert(subjectDefs.map((s) => ({ school_id: schoolId, section_id: secondaryId, ...s })));
  const subjects = await knex('subjects').where({ school_id: schoolId });
  const bySubjectName = Object.fromEntries(subjects.map((s) => [s.name, s]));

  // ---------------------------------------------------------------- Grading scale (school-editable defaults)
  const gradeBoundaries = [
    { school_id: schoolId, min_score: 70, max_score: 100, grade_key: 'A', description: 'Excellent' },
    { school_id: schoolId, min_score: 60, max_score: 69, grade_key: 'B', description: 'Very good' },
    { school_id: schoolId, min_score: 50, max_score: 59, grade_key: 'C', description: 'Good' },
    { school_id: schoolId, min_score: 0, max_score: 49, grade_key: 'F', description: 'Needs improvement' }
  ];
  await knex('grade_boundaries').insert(gradeBoundaries);
  const gradeFor = (total) => gradeBoundaries.find((g) => total >= g.min_score && total <= g.max_score)?.grade_key || null;

  await knex('rating_keys').insert([
    { school_id: schoolId, key_value: 5, description: 'Excellent' },
    { school_id: schoolId, key_value: 4, description: 'Good' },
    { school_id: schoolId, key_value: 3, description: 'Fair' },
    { school_id: schoolId, key_value: 2, description: 'Poor' },
    { school_id: schoolId, key_value: 1, description: 'Very poor' }
  ]);
  const ratingKeys = await knex('rating_keys').where({ school_id: schoolId });
  const ratingFor = (value) => ratingKeys.find((r) => r.key_value === value).id;

  await knex('number_sequences').insert([
    { school_id: schoolId, sequence_for: 'admission_no', format: '{PREFIX}/{YEAR}/{SEQ4}', prefix: 'ISS', next_number: 148, reset_period: 'yearly' },
    { school_id: schoolId, sequence_for: 'staff_no', format: '{PREFIX}-{SEQ3}', prefix: 'STF', next_number: 18, reset_period: 'never' },
    { school_id: schoolId, sequence_for: 'receipt_no', format: '{PREFIX}-{YEAR}-{SEQ4}', prefix: 'RCP', next_number: 4, reset_period: 'yearly' }
  ]);

  // ---------------------------------------------------------------- Fees setup
  const feeItemDefs = ['Tuition', 'Sports levy', 'PTA levy'];
  const feeItemIds = {};
  for (const name of feeItemDefs) {
    const [id] = await knex('fee_items').insert({ school_id: schoolId, name });
    feeItemIds[name] = id;
  }

  const feeAmounts = {
    [jss1.id]: { Tuition: 80000, 'Sports levy': 8000, 'PTA levy': 5000 },
    [jss2.id]: { Tuition: 100000, 'Sports levy': 10000, 'PTA levy': 5000 },
    [jss3.id]: { Tuition: 120000, 'Sports levy': 12000, 'PTA levy': 5000 }
  };
  for (const classId of [jss1.id, jss2.id, jss3.id]) {
    for (const [item, amount] of Object.entries(feeAmounts[classId])) {
      await knex('fee_structures').insert({ school_id: schoolId, fee_item_id: feeItemIds[item], class_id: classId, term_id: secondTerm.id, amount });
    }
  }

  await knex('payment_accounts').insert([
    { school_id: schoolId, type: 'cash', account_name: 'Cash' },
    { school_id: schoolId, type: 'bank', bank_name: 'Zenith Bank', account_number: '2219098987', account_name: 'Al-Minhaaj Model College' },
    { school_id: schoolId, type: 'bank', bank_name: 'Jaiz Bank', account_number: '23456784', account_name: 'Al-Minhaaj Model College' }
  ]);
  const accounts = await knex('payment_accounts').where({ school_id: schoolId });

  // ---------------------------------------------------------------- Psychomotor/affective + comment drafts
  await knex('trait_definitions').insert([
    { school_id: schoolId, domain: 'psychomotor', description: 'Handwriting', display_order: 0 },
    { school_id: schoolId, domain: 'psychomotor', description: 'Sports', display_order: 1 },
    { school_id: schoolId, domain: 'psychomotor', description: 'Handling of tools', display_order: 2 },
    { school_id: schoolId, domain: 'affective', description: 'Punctuality', display_order: 0 },
    { school_id: schoolId, domain: 'affective', description: 'Honesty', display_order: 1 },
    { school_id: schoolId, domain: 'affective', description: 'Neatness', display_order: 2 }
  ]);
  const traits = await knex('trait_definitions').where({ school_id: schoolId });

  await knex('comment_templates').insert([
    { school_id: schoolId, role: 'teacher', min_score: 70, max_score: 100, draft_text: 'Excellent performance this term, keep it up.' },
    { school_id: schoolId, role: 'teacher', min_score: 50, max_score: 69, draft_text: 'A good result this term. There is still room to push further.' },
    { school_id: schoolId, role: 'teacher', min_score: 0, max_score: 49, draft_text: 'Needs more effort in the coming term — please provide extra support at home.' },
    { school_id: schoolId, role: 'principal', min_score: 70, max_score: 100, draft_text: 'A pleasure to have in school. Well done this term.' },
    { school_id: schoolId, role: 'principal', min_score: 50, max_score: 69, draft_text: 'Satisfactory progress. Keep encouraging consistent effort.' },
    { school_id: schoolId, role: 'principal', min_score: 0, max_score: 49, draft_text: 'This result needs urgent attention. Let us work together to support improvement.' }
  ]);

  // ---------------------------------------------------------------- Staff: role logins + extra teaching staff
  const passwordHash = await bcrypt.hash('changeme123', 10);

  // One login per role, all the same password — for testing role-based access without hand-creating users each time.
  // The "developer" row is deliberately left unlinked to a staff record for now — the real cross-school
  // developer console (addendum-v4.md §9) gets its own separate auth path once that's built.
  const roleLogins = [
    { email: 'developer@educore.dev', role: 'developer', staffNo: null, firstName: 'Dev', lastName: 'Account' },
    { email: 'admin@educore.dev', role: 'admin', staffNo: 'STF-001', firstName: 'Admin', lastName: 'User' },
    { email: 'principal@educore.dev', role: 'principal', staffNo: 'STF-002', firstName: 'Aisha', lastName: 'Bello' },
    { email: 'classteacher@educore.dev', role: 'class_teacher', staffNo: 'STF-003', firstName: 'Fatimah', lastName: 'Adeyemi' },
    { email: 'subjectteacher@educore.dev', role: 'subject_teacher', staffNo: 'STF-004', firstName: 'Musa', lastName: 'Oladipo' },
    { email: 'bursar@educore.dev', role: 'bursar', staffNo: 'STF-005', firstName: 'Hauwa', lastName: 'Bello' }
  ];
  const staffByName = {};
  for (const r of roleLogins) {
    let staffId = null;
    if (r.staffNo) {
      [staffId] = await knex('staff').insert({ school_id: schoolId, staff_no: r.staffNo, first_name: r.firstName, last_name: r.lastName, staff_type: r.role });
      staffByName[r.firstName] = staffId;
    }
    await knex('users').insert({ school_id: schoolId, staff_id: staffId, email: r.email, password_hash: passwordHash, role: r.role });
  }

  // Extra teaching staff, no login — populates class/subject-teacher allocation with a real pool to pick from,
  // and demonstrates multiple teachers on one class-subject (Mathematics gets two, below).
  const extraStaff = [
    { staffNo: 'STF-006', firstName: 'Grace', lastName: 'Umeh', staff_type: 'class_teacher' },
    { staffNo: 'STF-007', firstName: 'Yusuf', lastName: 'Danjuma', staff_type: 'subject_teacher' },
    { staffNo: 'STF-008', firstName: 'Ibrahim', lastName: 'Lawal', staff_type: 'subject_teacher' }
  ];
  for (const s of extraStaff) {
    const [id] = await knex('staff').insert({ school_id: schoolId, staff_no: s.staffNo, first_name: s.firstName, last_name: s.lastName, staff_type: s.staff_type });
    staffByName[s.firstName] = id;
  }

  // ---------------------------------------------------------------- Class & subject teacher allocation
  await knex('class_teacher_assignments').insert([
    { term_id: secondTerm.id, class_id: jss1.id, staff_id: staffByName['Fatimah'] },
    { term_id: secondTerm.id, class_id: jss2.id, staff_id: staffByName['Grace'] },
    { term_id: secondTerm.id, class_id: jss3.id, staff_id: staffByName['Yusuf'] }
  ]);
  await knex('subject_teacher_assignments').insert([
    // Mathematics gets two teachers on the same class-subject — the multi-teacher case this schema supports.
    { term_id: secondTerm.id, class_id: jss2.id, subject_id: bySubjectName['Mathematics'].id, staff_id: staffByName['Musa'] },
    { term_id: secondTerm.id, class_id: jss2.id, subject_id: bySubjectName['Mathematics'].id, staff_id: staffByName['Yusuf'] },
    { term_id: secondTerm.id, class_id: jss2.id, subject_id: bySubjectName['English Language'].id, staff_id: staffByName['Fatimah'] },
    { term_id: secondTerm.id, class_id: jss2.id, subject_id: bySubjectName['Basic Science'].id, staff_id: staffByName['Grace'] },
    { term_id: secondTerm.id, class_id: jss2.id, subject_id: bySubjectName['Social Studies'].id, staff_id: staffByName['Musa'] },
    { term_id: secondTerm.id, class_id: jss2.id, subject_id: bySubjectName['Fine Art'].id, staff_id: staffByName['Ibrahim'] }
  ]);

  // ---------------------------------------------------------------- Students + guardians
  const studentDefs = [
    { class: jss1, first: 'Kelechi', last: 'Nwosu', sex: 'male', boarding: 'day', intake: 'new' },
    { class: jss1, first: 'Blessing', last: 'Mba', sex: 'female', boarding: 'boarder', intake: 'new' },
    { class: jss2, first: 'Amina', last: 'Yusuf', sex: 'female', boarding: 'day', intake: 'returning' },
    { class: jss2, first: 'Tunde', last: 'Okafor', sex: 'male', boarding: 'day', intake: 'returning' },
    { class: jss2, first: 'Chidinma', last: 'Eze', sex: 'female', boarding: 'boarder', intake: 'returning' },
    { class: jss3, first: 'Ibrahim', last: 'Sule', sex: 'male', boarding: 'day', intake: 'returning' },
    { class: jss3, first: 'Ngozi', last: 'Chukwu', sex: 'female', boarding: 'day', intake: 'new' },
    { class: jss3, first: 'David', last: 'Okon', sex: 'male', boarding: 'boarder', intake: 'returning' }
  ];

  let admissionSeq = 143;
  const students = {};
  for (const d of studentDefs) {
    const admissionNo = `ISS/2026/${String(admissionSeq++).padStart(4, '0')}`;
    const [id] = await knex('students').insert({ school_id: schoolId, admission_no: admissionNo, first_name: d.first, last_name: d.last, sex: d.sex, boarding_type: d.boarding });
    await knex('student_terms').insert({ student_id: id, term_id: secondTerm.id, class_id: d.class.id, status: 'active', intake_type: d.intake });
    await knex('student_guardians').insert({ student_id: id, name: `${d.sex === 'female' ? 'Mrs' : 'Mr'} ${d.last}`, relationship: d.sex === 'female' ? 'mother' : 'father', phone: '0803' + String(1000000 + id).slice(-7), is_primary: true });
    students[d.first] = id;
  }

  // ---------------------------------------------------------------- Payments (mix of paid-up and defaulters)
  const receiptSeq = { n: 1 };
  async function pay(studentId, amount, method, accountId) {
    const receiptNo = `RCP-2026-${String(receiptSeq.n++).padStart(4, "0")}`;
    await knex('payments').insert({ student_id: studentId, term_id: secondTerm.id, payment_account_id: accountId, amount, method, receipt_no: receiptNo, received_by_staff_id: staffByName['Hauwa'] });
  }
  await pay(students['Amina'], 80000, 'bank', accounts[1].id); // partial — leaves a balance (defaulter demo)
  await pay(students['Tunde'], 115000, 'bank', accounts[1].id); // full JSS2 total (100000+10000+5000) — paid up
  await pay(students['Kelechi'], 40000, 'cash', accounts[0].id); // partial — JSS1 defaulter demo
  // Ibrahim (JSS3) and the rest: no payment at all — clean "hasn't paid anything" defaulter case.

  await knex('fee_adjustments').insert({ student_id: students['Amina'], term_id: secondTerm.id, description: 'Sibling discount', amount: -5000, created_by_staff_id: staffByName['Hauwa'] });

  // ---------------------------------------------------------------- Subject scores, traits, remarks (JSS2 — the class with results to show)
  const scoreDefs = {
    Chidinma: { Mathematics: [18, 18, 55], 'English Language': [17, 18, 53], 'Basic Science': [17, 17, 51], 'Social Studies': [13, 14, 62], 'Fine Art': [9, 9, 72] },
    Amina: { Mathematics: [18, 17, 52], 'English Language': [16, 18, 48], 'Basic Science': [15, 16, 49], 'Social Studies': [12, 13, 53], 'Fine Art': [8, 9, 68] },
    Tunde: { Mathematics: [15, 14, 41], 'English Language': [14, 15, 45], 'Basic Science': [13, 14, 42], 'Social Studies': [10, 11, 51], 'Fine Art': [7, 8, 60] }
  };
  for (const [studentName, subjectScores] of Object.entries(scoreDefs)) {
    for (const [subjectName, [ca1, ca2, exam]] of Object.entries(subjectScores)) {
      const total = ca1 + ca2 + exam;
      await knex('subject_scores').insert({
        student_id: students[studentName],
        term_id: secondTerm.id,
        subject_id: bySubjectName[subjectName].id,
        ca1, ca2, exam, total,
        computed_grade: gradeFor(total),
        entered_by_staff_id: staffByName['Musa']
      });
    }
  }

  const traitRatings = {
    Chidinma: { Handwriting: 5, Sports: 4, 'Handling of tools': 5, Punctuality: 5, Honesty: 5, Neatness: 4 },
    Amina: { Handwriting: 4, Sports: 5, 'Handling of tools': 4, Punctuality: 4, Honesty: 5, Neatness: 5 },
    Tunde: { Handwriting: 3, Sports: 4, 'Handling of tools': 3, Punctuality: 3, Honesty: 4, Neatness: 3 }
  };
  for (const [studentName, ratings] of Object.entries(traitRatings)) {
    for (const [traitDesc, value] of Object.entries(ratings)) {
      const trait = traits.find((t) => t.description === traitDesc);
      await knex('trait_scores').insert({ student_id: students[studentName], term_id: secondTerm.id, trait_definition_id: trait.id, rating_key_id: ratingFor(value) });
    }
  }

  await knex('student_term_remarks').insert([
    {
      student_id: students['Chidinma'], term_id: secondTerm.id,
      days_present: 59, days_absent: 1, times_school_opened: 60,
      teacher_comment: 'An outstanding term — consistently top of the class.', teacher_id: staffByName['Grace'], teacher_commented_at: knex.fn.now(),
      principal_comment: 'Excellent all round. Well done, Chidinma.', principal_id: staffByName['Aisha'], principal_commented_at: knex.fn.now()
    },
    {
      student_id: students['Amina'], term_id: secondTerm.id,
      days_present: 58, days_absent: 2, times_school_opened: 60,
      teacher_comment: 'Excellent performance this term, keep it up.', teacher_id: staffByName['Grace'], teacher_commented_at: knex.fn.now(),
      principal_comment: 'A pleasure to have in school. Well done this term.', principal_id: staffByName['Aisha'], principal_commented_at: knex.fn.now()
    }
    // Tunde deliberately left without remarks — demonstrates the "not yet written" state on his report card.
  ]);

  // Publish JSS2's second term so the demo report cards/broadsheet/result-check are viewable immediately.
  await knex('term_class_publications').insert({ term_id: secondTerm.id, class_id: jss2.id, is_published: true, published_at: knex.fn.now(), published_by_staff_id: staffByName['Aisha'] });

  // ---------------------------------------------------------------- Notification log (honest "no provider configured" demo)
  await knex('notification_log').insert([
    { school_id: schoolId, channel: 'sms', recipient: '08031234567', message: 'Reminder: Kelechi Nwosu has an outstanding balance of \u20a648,000 this term.', status: 'failed', provider_response: 'No SMS/email provider configured for this school yet', related_student_id: students['Kelechi'] },
    { school_id: schoolId, channel: 'email', recipient: 'guardian@example.com', message: 'Payment receipt \u2014 \u20a680,000 received', status: 'failed', provider_response: 'No SMS/email provider configured for this school yet', related_student_id: students['Amina'] }
  ]);

  // ---------------------------------------------------------------- Module activation (developer console)
  // Active by default for this trusted demo school — the developer console can deactivate either.
  await knex('school_modules').insert([
    { school_id: schoolId, module: 'fees', is_active: true, activated_by_staff_id: staffByName['Admin'], activated_at: knex.fn.now() },
    { school_id: schoolId, module: 'report_card', is_active: true, activated_by_staff_id: staffByName['Admin'], activated_at: knex.fn.now() }
  ]);

  console.log('Seeded demo data: 1 school, 3 classes, 5 subjects, 8 students, 8 staff (5 with logins), fees, scores, traits, remarks. JSS 2 (second term) published.');
  console.log('Logins (all password: changeme123):');
  roleLogins.forEach((r) => console.log(`  ${r.email} — ${r.role}`));
}
