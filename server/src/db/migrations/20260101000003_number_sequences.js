export function up(knex) {
  return knex.schema.createTable('number_sequences', (t) => {
    t.increments('id').primary();
    t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('sequence_for').notNullable(); // 'admission_no' | 'staff_no' | 'receipt_no' | 'invoice_no'
    // Token format string, e.g. "{PREFIX}/{YEAR}/{SEQ4}" — see helpers/numberSequence.js for supported tokens.
    t.string('format').notNullable();
    t.string('prefix').defaultTo('');
    t.integer('next_number').notNullable().defaultTo(1);
    t.string('reset_period').notNullable().defaultTo('never'); // 'never' | 'yearly' | 'session'
    t.integer('last_reset_year');
    t.unique(['school_id', 'sequence_for']);
    t.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('number_sequences');
}
