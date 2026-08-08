export function up(knex) {
  return knex.schema.createTable('notification_log', (t) => {
    t.increments('id').primary();
    t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('channel').notNullable(); // 'sms' | 'email'
    t.string('recipient').notNullable();
    t.text('message').notNullable();
    t.string('status').notNullable().defaultTo('pending'); // pending | sent | failed
    t.string('provider_response');
    t.integer('related_student_id').unsigned().references('id').inTable('students').onDelete('SET NULL');
    t.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('notification_log');
}
