import bcrypt from 'bcryptjs';

export async function seed(knex) {
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
    { school_id: schoolId, sequence_for: 'staff_no', format: '{PREFIX}-{SEQ3}', prefix: 'STF', next_number: 15, reset_period: 'never' }
  ]);

  const passwordHash = await bcrypt.hash('changeme123', 10);
  await knex('users').insert({
    school_id: schoolId,
    email: 'admin@educore.dev',
    password_hash: passwordHash,
    role: 'admin'
  });

  console.log('Seeded: admin@educore.dev / changeme123');
}
