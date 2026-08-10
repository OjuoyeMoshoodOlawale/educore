export function up(knex) {
  return knex.schema
    .createTable('student_bills', (t) => {
      t.increments('id').primary();
      t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.integer('fee_structure_id').unsigned().notNullable().references('id').inTable('fee_structures').onDelete('CASCADE');
      t.decimal('amount', 12, 2).notNullable();
      t.boolean('is_compulsory').notNullable().defaultTo(true);
      t.string('status').notNullable().defaultTo('pending'); // pending | paid | partial
      // Matches SchoolFees Manager's `INSERT OR IGNORE` idempotency — generating bills twice
      // for the same student/term/fee-structure never duplicates a charge.
      t.unique(['student_id', 'term_id', 'fee_structure_id'], { indexName: 'student_bills_student_term_config_uq' });
      t.timestamps(true, true);
    })
    .createTable('previous_term_balance', (t) => {
      t.increments('id').primary();
      t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      t.integer('from_term_id').unsigned().references('id').inTable('terms');
      t.integer('to_term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.decimal('balance_amount', 12, 2).notNullable().defaultTo(0);
      t.unique(['student_id', 'to_term_id']);
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('previous_term_balance').dropTableIfExists('student_bills');
}
