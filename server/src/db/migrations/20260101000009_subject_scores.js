export function up(knex) {
  return knex.schema.createTable('subject_scores', (t) => {
    t.increments('id').primary();
    t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
    t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
    t.integer('subject_id').unsigned().notNullable().references('id').inTable('subjects').onDelete('CASCADE');
    t.decimal('ca1', 5, 2).notNullable().defaultTo(0);
    t.decimal('ca2', 5, 2).notNullable().defaultTo(0);
    t.decimal('exam', 5, 2).notNullable().defaultTo(0);
    t.decimal('total', 5, 2).notNullable().defaultTo(0);
    // Computed and stored at save time — per addendum-v4.md §10.5, a report card printed later for
    // an earlier term must keep showing the grade that was correct then, even if the grading scale
    // or a subject's max scores change afterward. Never recalculated live from current settings.
    t.string('computed_grade');
    t.integer('entered_by_staff_id').unsigned().references('id').inTable('staff');
    t.unique(['student_id', 'term_id', 'subject_id']);
    t.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('subject_scores');
}
