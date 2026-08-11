export function up(knex) {
  return knex.schema.alterTable('subject_scores', (t) => {
    t.integer('version').notNullable().defaultTo(1);
  });
}

export function down(knex) {
  return knex.schema.alterTable('subject_scores', (t) => {
    t.dropColumn('version');
  });
}
