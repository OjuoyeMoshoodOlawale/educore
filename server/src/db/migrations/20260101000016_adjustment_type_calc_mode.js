export function up(knex) {
  return knex.schema.alterTable('fee_adjustments', (t) => {
    t.string('type'); // 'discount' | 'addition' — matches schoolfees-manager's bill_adjustments exactly
    t.string('calc_mode').defaultTo('fixed'); // 'fixed' | 'percent'
  });
}

export function down(knex) {
  return knex.schema.alterTable('fee_adjustments', (t) => {
    t.dropColumn('type');
    t.dropColumn('calc_mode');
  });
}
