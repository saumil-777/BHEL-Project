const { v4: uuidv4 } = require('uuid');

/**
 * Cross-database compatible schema (SQLite + PostgreSQL)
 * Uses string UUIDs for SQLite compatibility
 */
exports.up = async function (knex) {
  const isSQLite = knex.client.config.client === 'better-sqlite3';

  // Helper: UUID column that works in both SQLite and PostgreSQL
  const uuidPrimary = (t) => {
    if (isSQLite) {
      return t.string('id', 36).primary(); // UUID stored as string in SQLite
    } else {
      return t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    }
  };

  const uuidCol = (t, name) => {
    if (isSQLite) {
      return t.string(name, 36);
    } else {
      return t.uuid(name);
    }
  };

  const jsonCol = (t, name, defaultVal = '{}') => {
    if (isSQLite) {
      return t.text(name).defaultTo(defaultVal); // JSON stored as TEXT in SQLite
    } else {
      return t.jsonb(name).defaultTo(defaultVal);
    }
  };

  // ── Organizations ────────────────────────────────────────────────────────────
  await knex.schema.createTable('organizations', (t) => {
    uuidPrimary(t);
    t.string('name').notNullable();
    t.string('industry');
    t.text('address');
    t.string('contact_email');
    t.string('contact_phone');
    t.string('logo_url');
    t.string('default_currency').defaultTo('INR');
    t.string('default_unit').defaultTo('pcs');
    jsonCol(t, 'settings', '{}');
    t.timestamps(true, true);
  });

  // ── Users ───────────────────────────────────────────────────────────────────
  await knex.schema.createTable('users', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('email').notNullable().unique();
    t.string('password_hash').notNullable();
    t.string('role').defaultTo('viewer');
    t.boolean('is_active').defaultTo(true);
    t.string('avatar_url');
    t.string('phone');
    t.string('department');
    t.string('reset_token');
    t.timestamp('reset_token_expiry');
    t.timestamps(true, true);
  });

  // ── Vendors ─────────────────────────────────────────────────────────────────
  await knex.schema.createTable('vendors', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('name').notNullable();
    t.string('contact_person');
    t.string('email');
    t.string('phone');
    t.text('address');
    t.decimal('rating', 3, 2).defaultTo(0);
    t.string('status').defaultTo('active');
    t.text('notes');
    t.timestamps(true, true);
  });

  // ── Warehouses ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('warehouses', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('address');
    t.string('manager_name');
    t.string('manager_phone');
    jsonCol(t, 'zones', '[]');
    t.boolean('is_active').defaultTo(true);
    t.timestamps(true, true);
  });

  // ── Locations ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('locations', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'warehouse_id').references('id').inTable('warehouses').onDelete('CASCADE');
    t.string('zone').notNullable();
    t.string('rack').notNullable();
    t.string('shelf');
    t.integer('capacity').defaultTo(0);
    t.string('unit').defaultTo('pcs');
    t.timestamps(true, true);
  });

  // ── Workflows ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('workflows', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('name').notNullable();
    jsonCol(t, 'stages', '[]');
    t.boolean('is_default').defaultTo(false);
    t.timestamps(true, true);
  });

  // ── Materials ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('materials', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('material_id').notNullable();
    t.string('name').notNullable();
    t.string('category');
    t.string('sku');
    uuidCol(t, 'vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
    t.decimal('quantity', 15, 4).defaultTo(0);
    t.string('unit').defaultTo('pcs');
    t.decimal('cost', 15, 2).defaultTo(0);
    t.decimal('total_value', 15, 2).defaultTo(0);
    uuidCol(t, 'location_id').references('id').inTable('locations').onDelete('SET NULL');
    t.string('status').defaultTo('received');
    t.string('hsn_code');
    t.text('description');
    t.string('brand');
    t.string('model');
    t.string('serial_number');
    t.string('batch_number');
    t.date('expiry_date');
    t.decimal('min_stock_level', 15, 4).defaultTo(0);
    t.decimal('reorder_level', 15, 4).defaultTo(0);
    uuidCol(t, 'workflow_id').references('id').inTable('workflows').onDelete('SET NULL');
    uuidCol(t, 'created_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('qr_code_url');
    t.string('barcode');
    t.timestamps(true, true);
  });

  // ── Material Status History ──────────────────────────────────────────────────
  await knex.schema.createTable('material_status_history', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'material_id').references('id').inTable('materials').onDelete('CASCADE');
    t.string('from_status');
    t.string('to_status').notNullable();
    t.text('notes');
    uuidCol(t, 'changed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('changed_at').defaultTo(knex.fn.now());
  });

  // ── Inventory Transactions ──────────────────────────────────────────────────
  await knex.schema.createTable('inventory_transactions', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    uuidCol(t, 'material_id').references('id').inTable('materials').onDelete('CASCADE');
    t.string('type').notNullable();
    t.decimal('quantity', 15, 4).notNullable();
    t.decimal('unit_cost', 15, 2);
    uuidCol(t, 'from_location_id').references('id').inTable('locations').onDelete('SET NULL');
    uuidCol(t, 'to_location_id').references('id').inTable('locations').onDelete('SET NULL');
    t.string('reference_number');
    t.text('notes');
    uuidCol(t, 'created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── Quality Inspections ─────────────────────────────────────────────────────
  await knex.schema.createTable('quality_inspections', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    uuidCol(t, 'material_id').references('id').inTable('materials').onDelete('CASCADE');
    t.string('inspection_number').notNullable();
    uuidCol(t, 'inspector_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('result').defaultTo('pending');
    t.text('notes');
    jsonCol(t, 'checklist', '[]');
    t.string('report_url');
    t.integer('quantity_inspected');
    t.integer('quantity_passed');
    t.integer('quantity_failed');
    t.timestamp('inspected_at');
    t.timestamps(true, true);
  });

  // ── Purchase Orders ─────────────────────────────────────────────────────────
  await knex.schema.createTable('purchase_orders', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('po_number').notNullable();
    uuidCol(t, 'vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
    t.string('status').defaultTo('draft');
    t.decimal('subtotal', 15, 2).defaultTo(0);
    t.decimal('tax', 15, 2).defaultTo(0);
    t.decimal('discount', 15, 2).defaultTo(0);
    t.decimal('total', 15, 2).defaultTo(0);
    t.date('order_date');
    t.date('expected_delivery');
    t.text('notes');
    t.text('terms');
    uuidCol(t, 'created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // ── PO Items ────────────────────────────────────────────────────────────────
  await knex.schema.createTable('po_items', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'po_id').references('id').inTable('purchase_orders').onDelete('CASCADE');
    uuidCol(t, 'material_id').references('id').inTable('materials').onDelete('SET NULL');
    t.string('description');
    t.decimal('quantity', 15, 4).notNullable();
    t.string('unit');
    t.decimal('unit_price', 15, 2).notNullable();
    t.decimal('total', 15, 2).notNullable();
    t.decimal('received_qty', 15, 4).defaultTo(0);
  });

  // ── Movements ───────────────────────────────────────────────────────────────
  await knex.schema.createTable('movements', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    uuidCol(t, 'material_id').references('id').inTable('materials').onDelete('CASCADE');
    uuidCol(t, 'from_location_id').references('id').inTable('locations').onDelete('SET NULL');
    uuidCol(t, 'to_location_id').references('id').inTable('locations').onDelete('SET NULL');
    t.string('from_warehouse');
    t.string('to_warehouse');
    t.string('department');
    t.text('reason');
    uuidCol(t, 'moved_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('moved_at').defaultTo(knex.fn.now());
  });

  // ── Notifications ───────────────────────────────────────────────────────────
  await knex.schema.createTable('notifications', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    uuidCol(t, 'user_id').references('id').inTable('users').onDelete('CASCADE');
    t.string('type').notNullable();
    t.string('title').notNullable();
    t.text('body');
    t.boolean('is_read').defaultTo(false);
    t.string('entity_type');
    uuidCol(t, 'entity_id');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── Audit Logs ──────────────────────────────────────────────────────────────
  await knex.schema.createTable('audit_logs', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    uuidCol(t, 'user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('user_name');
    t.string('user_email');
    t.string('action').notNullable();
    t.string('entity_type').notNullable();
    uuidCol(t, 'entity_id');
    jsonCol(t, 'prev_value', 'null');
    jsonCol(t, 'new_value', 'null');
    t.string('ip_address');
    t.timestamp('timestamp').defaultTo(knex.fn.now());
  });

  // ── Files ───────────────────────────────────────────────────────────────────
  await knex.schema.createTable('files', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'org_id').references('id').inTable('organizations').onDelete('CASCADE');
    t.string('entity_type').notNullable();
    uuidCol(t, 'entity_id').notNullable();
    t.string('filename').notNullable();
    t.string('original_name').notNullable();
    t.string('mime_type');
    t.bigInteger('size');
    t.string('path');
    uuidCol(t, 'uploaded_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // ── Refresh Tokens ──────────────────────────────────────────────────────────
  await knex.schema.createTable('refresh_tokens', (t) => {
    uuidPrimary(t);
    uuidCol(t, 'user_id').references('id').inTable('users').onDelete('CASCADE');
    t.text('token').notNullable();
    t.timestamp('expires_at').notNullable();
    t.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  const tables = [
    'refresh_tokens', 'files', 'audit_logs', 'notifications', 'movements',
    'po_items', 'purchase_orders', 'quality_inspections', 'inventory_transactions',
    'material_status_history', 'materials', 'workflows', 'locations',
    'warehouses', 'vendors', 'users', 'organizations',
  ];
  for (const table of tables) {
    await knex.schema.dropTableIfExists(table);
  }
};
