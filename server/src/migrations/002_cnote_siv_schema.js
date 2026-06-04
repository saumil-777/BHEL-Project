const { v4: uuidv4 } = require('uuid');

/**
 * Migration: Add Consignment Notes (C-Notes) and Store Issue Vouchers (SIV) tables
 * Cross-database compatible (SQLite + PostgreSQL)
 */
exports.up = async function (knex) {
  const isSQLite = knex.client.config.client === 'better-sqlite3';

  const uuidPrimary = (t) => {
    if (isSQLite) return t.string('id', 36).primary();
    else return t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
  };

  const uuidCol = (t, name) => {
    if (isSQLite) return t.string(name, 36);
    else return t.uuid(name);
  };

  // ── Consignment Notes ────────────────────────────────────────────────────────
  await knex.schema.createTable('consignment_notes', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('cnote_number').notNullable();
    uuidCol(t, 'vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
    t.string('vendor_name');
    t.string('vendor_code');
    uuidCol(t, 'material_id').references('id').inTable('materials').onDelete('SET NULL');
    t.string('material_name');
    t.decimal('quantity', 15, 4).defaultTo(0);
    t.string('unit').defaultTo('pcs');
    t.string('transporter_name');
    t.string('vehicle_number');
    t.date('dispatch_date');
    t.date('arrival_date');
    t.string('po_number');
    t.string('invoice_number');
    t.string('status').defaultTo('draft');
    t.text('remarks');
    uuidCol(t, 'created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ── Store Issue Vouchers ─────────────────────────────────────────────────────
  await knex.schema.createTable('store_issue_vouchers', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('siv_number').notNullable();
    uuidCol(t, 'material_id').references('id').inTable('materials').onDelete('SET NULL');
    t.string('material_name');
    t.string('department');
    t.string('requested_by');
    uuidCol(t, 'approved_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('approved_by_name');
    t.decimal('quantity_issued', 15, 4).defaultTo(0);
    t.date('date_issued');
    t.text('remarks');
    t.string('status').defaultTo('pending');
    uuidCol(t, 'created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  console.log('✅ Migration 002: consignment_notes and store_issue_vouchers tables created');
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('store_issue_vouchers');
  await knex.schema.dropTableIfExists('consignment_notes');
};
