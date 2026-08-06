export function up(knex) {
  return knex.schema
    .createTable('grade_boundaries', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.integer('min_score').notNullable();
      t.integer('max_score').notNullable();
      t.string('grade_key').notNullable(); // 'A' | 'B' | ...
      t.string('description');
      t.timestamps(true, true);
    })
    .createTable('rating_keys', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.integer('key_value').notNullable(); // 1-5 star scale
      t.string('description').notNullable();
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('rating_keys')
    .dropTableIfExists('grade_boundaries');
}
