export function up(knex) {
  return knex.schema
    .createTable('schools', (t) => {
      t.increments('id').primary();
      t.string('name').notNullable();
      t.string('motto');
      t.text('address');
      t.string('email');
      t.string('phone');
      t.string('website');
      t.string('logo_url');
      t.timestamps(true, true);
    })
    .createTable('sessions', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('name').notNullable(); // e.g. "2025/2026"
      t.boolean('is_active').notNullable().defaultTo(false);
      t.timestamps(true, true);
    })
    .createTable('terms', (t) => {
      t.increments('id').primary();
      t.integer('session_id').unsigned().notNullable().references('id').inTable('sessions').onDelete('CASCADE');
      t.string('name').notNullable(); // "First term" | "Second term" | "Third term"
      t.date('opens_on');
      t.date('closes_on');
      t.integer('holiday_count').defaultTo(0);
      t.date('next_term_begins');
      t.boolean('is_current').notNullable().defaultTo(false);
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('terms')
    .dropTableIfExists('sessions')
    .dropTableIfExists('schools');
}
