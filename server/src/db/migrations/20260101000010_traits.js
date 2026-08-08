export function up(knex) {
  return knex.schema
    .createTable('trait_definitions', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('domain').notNullable(); // 'psychomotor' | 'affective'
      t.string('description').notNullable();
      t.integer('display_order').notNullable().defaultTo(0);
      t.timestamps(true, true);
    })
    .createTable('trait_scores', (t) => {
      t.increments('id').primary();
      t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.integer('trait_definition_id').unsigned().notNullable().references('id').inTable('trait_definitions').onDelete('CASCADE');
      t.integer('rating_key_id').unsigned().notNullable().references('id').inTable('rating_keys');
      t.unique(['student_id', 'term_id', 'trait_definition_id'], { indexName: 'trait_scores_student_term_trait_uq' });
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('trait_scores').dropTableIfExists('trait_definitions');
}
