export function up(knex) {
  return knex.schema.createTable('school_modules', (t) => {
    t.increments('id').primary();
    t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('module').notNullable(); // 'fees' | 'report_card'
    t.boolean('is_active').notNullable().defaultTo(false);
    t.integer('activated_by_staff_id').unsigned().references('id').inTable('staff');
    t.timestamp('activated_at');
    t.unique(['school_id', 'module']);
    t.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('school_modules');
}
