export function up(knex) {
  return knex.schema.createTable('notification_settings', (t) => {
    t.increments('id').primary();
    t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
    t.string('channel').notNullable(); // 'email' | 'sms'
    t.boolean('is_active').notNullable().defaultTo(false);

    // Email (SMTP)
    t.string('smtp_host');
    t.integer('smtp_port');
    t.string('smtp_username');
    t.text('smtp_password_encrypted');
    t.string('smtp_from_address');
    t.string('smtp_from_name');

    // SMS
    t.string('sms_provider'); // e.g. 'termii'
    t.text('sms_api_key_encrypted');
    t.string('sms_sender_id');

    t.unique(['school_id', 'channel']);
    t.timestamps(true, true);
  });
}

export function down(knex) {
  return knex.schema.dropTableIfExists('notification_settings');
}
