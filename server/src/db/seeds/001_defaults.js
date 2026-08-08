import bcrypt from 'bcryptjs';

export async function seed(knex) {
  await knex('payments').del();
  await knex('payment_accounts').del();
  await knex('fee_adjustments').del();
  await knex('fee_structures').del();
  await knex('fee_items').del();
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

  const [secondaryId] = await knex('school_sections').insert({ school_id: schoolId, name: 'Secondary', display_order: 0 });
  await knex('classes').insert([
    { school_id: schoolId, section_id: secondaryId, name: 'JSS 1', display_order: 0 },
    { school_id: schoolId, section_id: secondaryId, name: 'JSS 2', display_order: 1 },
    { school_id: schoolId, section_id: secondaryId, name: 'JSS 3', display_order: 2 }
  ]);

  // Sensible defaults, editable immediately — nobody starts from a blank grading scale.
  await knex('grade_boundaries').insert([
    { school_id: schoolId, min_score: 70, max_score: 100, grade_key: 'A', description: 'Excellent' },
    { school_id: schoolId, min_score: 60, max_score: 69, grade_key: 'B', description: 'Very good' },
    { school_id: schoolId, min_score: 50, max_score: 59, grade_key: 'C', description: 'Good' },
    { school_id: schoolId, min_score: 0, max_score: 49, grade_key: 'F', description: 'Needs improvement' }
  ]);

  await knex('rating_keys').insert([
    { school_id: schoolId, key_value: 5, description: 'Excellent' },
    { school_id: schoolId, key_value: 4, description: 'Good' },
    { school_id: schoolId, key_value: 3, description: 'Fair' },
    { school_id: schoolId, key_value: 2, description: 'Poor' },
    { school_id: schoolId, key_value: 1, description: 'Very poor' }
  ]);

  await knex('number_sequences').insert([
    { school_id: schoolId, sequence_for: 'admission_no', format: '{PREFIX}/{YEAR}/{SEQ4}', prefix: 'ISS', next_number: 143, reset_period: 'yearly' },
    { school_id: schoolId, sequence_for: 'staff_no', format: '{PREFIX}-{SEQ3}', prefix: 'STF', next_number: 15, reset_period: 'never' },
    { school_id: schoolId, sequence_for: 'receipt_no', format: '{PREFIX}-{YEAR}-{SEQ4}', prefix: 'RCT', next_number: 1, reset_period: 'yearly' }
  ]);

  const jss2 = await knex('classes').where({ school_id: schoolId, name: 'JSS 2' }).first();
  const [tuitionId] = await knex('fee_items').insert({ school_id: schoolId, name: 'Tuition' });
  const [sportsId] = await knex('fee_items').insert({ school_id: schoolId, name: 'Sports levy' });
  const secondTerm = await knex('terms').where({ session_id: sessionId, name: 'Second term' }).first();
  await knex('fee_structures').insert([
    { school_id: schoolId, fee_item_id: tuitionId, class_id: jss2.id, term_id: secondTerm.id, amount: 100000 },
    { school_id: schoolId, fee_item_id: sportsId, class_id: jss2.id, term_id: secondTerm.id, amount: 10000 }
  ]);
  await knex('payment_accounts').insert([
    { school_id: schoolId, type: 'cash', account_name: 'Cash' },
    { school_id: schoolId, type: 'bank', bank_name: 'Zenith Bank', account_number: '2219098987', account_name: 'Al-Minhaaj Model College' }
  ]);

  const passwordHash = await bcrypt.hash('changeme123', 10);

  // One login per role, all the same password — for testing role-based access without hand-creating users each time.
  // Each (except developer) gets a real linked staff row, so req.user.staff_id is populated for FK columns
  // like payments.received_by_staff_id — the developer role is deliberately left unlinked for now; the real
  // cross-school developer console (addendum-v4.md §9) gets its own separate auth path once that's built.
  const roles = [
    { email: 'developer@educore.dev', role: 'developer', staffNo: null, firstName: 'Dev', lastName: 'Account' },
    { email: 'admin@educore.dev', role: 'admin', staffNo: 'STF-001', firstName: 'Admin', lastName: 'User' },
    { email: 'principal@educore.dev', role: 'principal', staffNo: 'STF-002', firstName: 'Aisha', lastName: 'Bello' },
    { email: 'classteacher@educore.dev', role: 'class_teacher', staffNo: 'STF-003', firstName: 'Fatimah', lastName: 'Adeyemi' },
    { email: 'subjectteacher@educore.dev', role: 'subject_teacher', staffNo: 'STF-004', firstName: 'Musa', lastName: 'Oladipo' },
    { email: 'bursar@educore.dev', role: 'bursar', staffNo: 'STF-005', firstName: 'Hauwa', lastName: 'Bello' }
  ];

  for (const r of roles) {
    let staffId = null;
    if (r.staffNo) {
      [staffId] = await knex('staff').insert({
        school_id: schoolId,
        staff_no: r.staffNo,
        first_name: r.firstName,
        last_name: r.lastName,
        staff_type: r.role
      });
    }
    await knex('users').insert({ school_id: schoolId, staff_id: staffId, email: r.email, password_hash: passwordHash, role: r.role });
  }

  console.log('Seeded users (all password: changeme123):');
  roles.forEach((r) => console.log(`  ${r.email} — ${r.role}`));
}
