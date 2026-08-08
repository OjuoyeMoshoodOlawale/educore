export function up(knex) {
  return knex.schema
    .createTable('students', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('admission_no').notNullable();
      t.string('first_name').notNullable();
      t.string('last_name').notNullable();
      t.string('other_name');
      t.string('sex');
      t.date('date_of_birth');
      t.string('boarding_type').defaultTo('day'); // 'day' | 'boarder'
      t.string('address');
      t.string('occupation');
      t.string('photo_url');
      t.boolean('is_result_blocked').notNullable().defaultTo(false);
      t.string('block_reason');
      t.unique(['school_id', 'admission_no']);
      t.timestamps(true, true);
    })
    .createTable('student_guardians', (t) => {
      t.increments('id').primary();
      t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      t.string('name').notNullable();
      t.string('relationship'); // mother | father | guardian
      t.string('phone');
      t.string('email');
      t.boolean('is_primary').notNullable().defaultTo(false);
      t.timestamps(true, true);
    })
    .createTable('student_terms', (t) => {
      t.increments('id').primary();
      t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
      t.string('status').notNullable().defaultTo('active'); // active | inactive | graduated | withdrawn
      t.string('intake_type').notNullable().defaultTo('new'); // new | returning
      t.unique(['student_id', 'term_id']);
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('student_terms')
    .dropTableIfExists('student_guardians')
    .dropTableIfExists('students');
}
