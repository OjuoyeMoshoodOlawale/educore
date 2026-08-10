export function up(knex) {
  return knex.schema.createTable('permission_overrides', (t) => {
    t.increments('id').primary();
    t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('resource').notNullable(); // e.g. 'fees.record_payment', 'students.edit', 'results.publish'
    t.string('effect').notNullable(); // 'allow' | 'deny'
    t.integer('created_by_staff_id').unsigned().references('id').inTable('staff');
    t.unique(['user_id', 'resource']);
    t.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('permission_overrides');
}
