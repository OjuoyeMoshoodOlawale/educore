export async function up(knex) {
  await knex.schema.alterTable('students', (t) => {
    // WAEC/NECO and other external exam registrations need state/country of origin, not just
    // an address — these are stable facts about the student, unlike boarding_type below.
    t.string('state_of_origin');
    t.string('lga_of_origin');
    t.string('country_of_origin').defaultTo('Nigeria');
  });

  await knex.schema.alterTable('student_terms', (t) => {
    // Boarding status can change term to term (a day student can become a boarder and back) —
    // it belongs on the per-term enrollment record, not as a fixed attribute of the student.
    t.string('boarding_type').defaultTo('day');
  });

  // Backfill: carry each student's existing boarding_type into every one of their student_terms
  // rows before the old column is dropped, so no data is lost in the move.
  const students = await knex('students').select('id', 'boarding_type');
  for (const s of students) {
    if (s.boarding_type) {
      await knex('student_terms').where({ student_id: s.id }).update({ boarding_type: s.boarding_type });
    }
  }

  await knex.schema.alterTable('students', (t) => {
    t.dropColumn('boarding_type');
  });
}

export async function down(knex) {
  await knex.schema.alterTable('students', (t) => {
    t.string('boarding_type').defaultTo('day');
  });

  const enrollments = await knex('student_terms').select('student_id', 'boarding_type').orderBy('id');
  for (const e of enrollments) {
    await knex('students').where({ id: e.student_id }).update({ boarding_type: e.boarding_type });
  }

  await knex.schema.alterTable('students', (t) => {
    t.dropColumn('state_of_origin');
    t.dropColumn('lga_of_origin');
    t.dropColumn('country_of_origin');
  });
  await knex.schema.alterTable('student_terms', (t) => {
    t.dropColumn('boarding_type');
  });
}
