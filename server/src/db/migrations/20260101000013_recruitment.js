export function up(knex) {
  return knex.schema
    .createTable('job_postings', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('title').notNullable();
      t.text('description');
      t.string('department');
      t.string('status').notNullable().defaultTo('open'); // open | closed
      t.timestamp('posted_at').defaultTo(knex.fn.now());
      t.timestamps(true, true);
    })
    .createTable('applicants', (t) => {
      t.increments('id').primary();
      t.integer('job_posting_id').unsigned().notNullable().references('id').inTable('job_postings').onDelete('CASCADE');
      t.string('name').notNullable();
      t.string('email');
      t.string('phone');
      t.string('resume_url');
      t.text('cover_note');
      // Denormalized current stage for fast pipeline queries — application_stages below is the full history.
      t.string('current_stage').notNullable().defaultTo('applied'); // applied | screening | interview | offer | hired | rejected
      t.timestamps(true, true);
    })
    .createTable('application_stages', (t) => {
      t.increments('id').primary();
      t.integer('applicant_id').unsigned().notNullable().references('id').inTable('applicants').onDelete('CASCADE');
      t.string('stage').notNullable();
      t.text('notes');
      t.integer('moved_by_staff_id').unsigned().references('id').inTable('staff');
      t.timestamp('moved_at').defaultTo(knex.fn.now());
    })
    .createTable('interview_schedule', (t) => {
      t.increments('id').primary();
      t.integer('applicant_id').unsigned().notNullable().references('id').inTable('applicants').onDelete('CASCADE');
      t.timestamp('scheduled_at').notNullable();
      t.integer('interviewer_staff_id').unsigned().references('id').inTable('staff');
      t.string('location_or_link');
      t.text('outcome_notes');
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('interview_schedule')
    .dropTableIfExists('application_stages')
    .dropTableIfExists('applicants')
    .dropTableIfExists('job_postings');
}
