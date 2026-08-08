export function up(knex) {
  return knex.schema
    .createTable('fee_items', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('name').notNullable();
      t.timestamps(true, true);
    })
    .createTable('fee_structures', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.integer('fee_item_id').unsigned().notNullable().references('id').inTable('fee_items').onDelete('CASCADE');
      t.integer('class_id').unsigned().notNullable().references('id').inTable('classes').onDelete('CASCADE');
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.decimal('amount', 12, 2).notNullable();
      t.string('applies_to_gender').notNullable().defaultTo('all'); // all | male | female
      t.string('applies_to_intake').notNullable().defaultTo('all'); // all | new | returning
      t.string('applies_to_boarding_type').notNullable().defaultTo('all'); // all | day | boarder
      t.timestamps(true, true);
    })
    .createTable('fee_adjustments', (t) => {
      t.increments('id').primary();
      t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.string('description').notNullable();
      t.decimal('amount', 12, 2).notNullable(); // negative = discount, positive = extra charge
      t.integer('created_by_staff_id').unsigned().references('id').inTable('staff');
      t.timestamps(true, true);
    })
    .createTable('payment_accounts', (t) => {
      t.increments('id').primary();
      t.integer('school_id').unsigned().notNullable().references('id').inTable('schools').onDelete('CASCADE');
      t.string('type').notNullable(); // cash | bank
      t.string('bank_name');
      t.string('account_number');
      t.string('account_name');
      t.boolean('is_active').notNullable().defaultTo(true);
      t.timestamps(true, true);
    })
    .createTable('payments', (t) => {
      t.increments('id').primary();
      t.integer('student_id').unsigned().notNullable().references('id').inTable('students').onDelete('CASCADE');
      t.integer('term_id').unsigned().notNullable().references('id').inTable('terms').onDelete('CASCADE');
      t.integer('payment_account_id').unsigned().references('id').inTable('payment_accounts');
      t.decimal('amount', 12, 2).notNullable();
      t.string('method').notNullable(); // cash | bank | transfer | card
      t.string('reference');
      t.integer('received_by_staff_id').unsigned().references('id').inTable('staff');
      t.string('receipt_no');
      t.timestamp('reversed_at');
      t.integer('reversed_by_staff_id').unsigned().references('id').inTable('staff');
      t.string('reversal_reason');
      t.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('payments')
    .dropTableIfExists('payment_accounts')
    .dropTableIfExists('fee_adjustments')
    .dropTableIfExists('fee_structures')
    .dropTableIfExists('fee_items');
}
