export function up(knex) {
  return knex.schema
    .createTable('student_term_remarks', (t) => {
      t.increments('id').primary();
      t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.integer('days_present').defaultTo(0);
      t.integer('days_absent').defaultTo(0);
      t.integer('times_school_opened').defaultTo(0);
      t.text('teacher_comment');
      t.integer('teacher_id').unsigned().references('id').inTable('staff');
      t.timestamp('teacher_commented_at');
      t.text('principal_comment');
      t.integer('principal_id').unsigned().references('id').inTable('staff');
      t.timestamp('principal_commented_at');
      t.unique(['student_id', 'term_id']);
      t.timestamps(true, true);
    })
    .createTable('comment_templates', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('role').notNullable(); // 'teacher' | 'principal'
      t.integer('min_score').notNullable();
      t.integer('max_score').notNullable();
      t.text('draft_text').notNullable();
      t.timestamps(true, true);
    })
    .createTable('term_class_publications', (t) => {
      t.increments('id').primary();
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
      t.boolean('is_published').notNullable().defaultTo(false);
      t.timestamp('published_at');
      t.integer('published_by_staff_id').unsigned().references('id').inTable('staff');
      t.unique(['term_id', 'class_id']);
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('term_class_publications')
    .dropTableIfExists('comment_templates')
    .dropTableIfExists('student_term_remarks');
}
