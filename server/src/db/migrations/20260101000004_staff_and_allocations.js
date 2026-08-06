export function up(knex) {
  return knex.schema
    .createTable('staff', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('staff_no').notNullable();
      t.string('first_name').notNullable();
      t.string('last_name').notNullable();
      t.string('other_name');
      t.string('sex');
      t.date('date_of_birth');
      t.string('phone');
      t.string('email');
      t.string('staff_type'); // class_teacher | subject_teacher | bursar | principal | admin
      t.string('qualification');
      t.string('institution');
      t.string('graduated_year');
      t.string('photo_url');
      t.string('signature_url');
      t.boolean('is_active').notNullable().defaultTo(true);
      t.unique(['school_id', 'staff_no']);
      t.timestamps(true, true);
    })
    .createTable('users', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.integer('staff_id').unsigned().references('id').inTable('staff').onDelete('CASCADE');
      t.string('email').notNullable();
      t.string('password_hash').notNullable();
      t.string('role').notNullable(); // developer | admin | principal | class_teacher | subject_teacher | bursar
      t.unique(['school_id', 'email']);
      t.timestamps(true, true);
    })
    .createTable('staff_terms', (t) => {
      t.increments('id').primary();
      t.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE');
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.string('status').notNullable().defaultTo('active');
      t.boolean('is_class_head').notNullable().defaultTo(false);
      t.boolean('is_section_head').notNullable().defaultTo(false);
      t.unique(['staff_id', 'term_id']);
      t.timestamps(true, true);
    })
    .createTable('class_teacher_assignments', (t) => {
      t.increments('id').primary();
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
      t.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE');
      t.unique(['term_id', 'class_id', 'staff_id']);
      t.timestamps(true, true);
    })
    .createTable('subject_teacher_assignments', (t) => {
      t.increments('id').primary();
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
      t.integer('subject_id').unsigned().notNullable().references('id').inTable('subjects').onDelete('CASCADE');
      t.integer('staff_id').unsigned().notNullable().references('id').inTable('staff').onDelete('CASCADE');
      // Deliberately no unique(term,class,subject) — multiple teachers per class-subject is a supported case.
      t.unique(['term_id', 'class_id', 'subject_id', 'staff_id']);
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('subject_teacher_assignments')
    .dropTableIfExists('class_teacher_assignments')
    .dropTableIfExists('staff_terms')
    .dropTableIfExists('users')
    .dropTableIfExists('staff');
}
