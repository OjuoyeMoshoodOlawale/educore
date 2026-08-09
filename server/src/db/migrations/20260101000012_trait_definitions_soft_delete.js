export function up(knex) {
  return knex.schema.alterTable('trait_definitions', (t) => {
    t.boolean('is_active').notNullable().defaultTo(true);
  });
}

export function down(knex) {
  return knex.schema.alterTable('trait_definitions', (t) => {
    t.dropColumn('is_active');
  });
}
