export function up(knex) {
  return knex.schema
    .createTable('school_sections', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('name').notNullable();
      t.integer('display_order').notNullable().defaultTo(0);
      t.timestamps(true, true);
    })
    .createTable('classes', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.integer('section_id').unsigned().references('id').inTable('school_sections').onDelete('SET NULL');
      t.string('name').notNullable();
      t.integer('display_order').notNullable().defaultTo(0);
      t.timestamps(true, true);
    })
    .createTable('subjects', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.integer('section_id').unsigned().references('id').inTable('school_sections').onDelete('SET NULL');
      t.string('name').notNullable();
      t.string('code');
      t.boolean('is_core').notNullable().defaultTo(true);
      t.integer('ca1_max').notNullable().defaultTo(20);
      t.integer('ca2_max').notNullable().defaultTo(20);
      t.integer('exam_max').notNullable().defaultTo(60);
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('subjects')
    .dropTableIfExists('classes')
    .dropTableIfExists('school_sections');
}
