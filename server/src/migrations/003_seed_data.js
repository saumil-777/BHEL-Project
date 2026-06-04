/**
 * Seed initial data — compatible with SQLite and PostgreSQL
 * Uses manual UUID generation instead of .returning('*') for SQLite support
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Knex requires up/down for migrations
exports.up = exports.seed = async function (knex) {
  const isSQLite = knex.client.config.client === 'better-sqlite3';

  // Clear all data in reverse order
  const tables = [
    'store_issue_vouchers', 'consignment_notes',
    'audit_logs', 'notifications', 'movements', 'po_items', 'purchase_orders',
    'quality_inspections', 'inventory_transactions', 'material_status_history',
    'materials', 'workflows', 'locations', 'warehouses', 'vendors',
    'refresh_tokens', 'users', 'organizations',
  ];
  for (const table of tables) {
    const exists = await knex.schema.hasTable(table);
    if (exists) await knex(table).del();
  }

  // ── Organization ─────────────────────────────────────────────────────────────
  const orgId = uuidv4();
  await knex('organizations').insert({
    id: orgId,
    name: 'BHEL - Bharat Heavy Electricals Limited',
    industry: 'Manufacturing',
    address: 'BHEL House, Siri Fort, New Delhi - 110049',
    contact_email: 'info@bhel.in',
    contact_phone: '+91-11-26001000',
    default_currency: 'INR',
    default_unit: 'pcs',
  });

  // ── Password hash ────────────────────────────────────────────────────────────
  const hash = await bcrypt.hash('Admin@123', 12);

  // ── Users ────────────────────────────────────────────────────────────────────
  const superAdminId = uuidv4();
  const orgAdminId   = uuidv4();
  const invMgrId     = uuidv4();
  const qualMgrId    = uuidv4();
  const whMgrId      = uuidv4();
  const storeKeepId  = uuidv4();
  const viewerId     = uuidv4();
  const matTeamId    = uuidv4();
  const dtgTeamId    = uuidv4();

  await knex('users').insert([
    { id: superAdminId, org_id: orgId, name: 'Super Administrator', email: 'superadmin@smimp.com', password_hash: hash, role: 'super_admin', department: 'IT', is_active: true },
    { id: orgAdminId,   org_id: orgId, name: 'Rajesh Kumar',        email: 'admin@bhel.in',        password_hash: hash, role: 'org_admin', department: 'Administration', phone: '+91-9876543210', is_active: true },
    { id: invMgrId,     org_id: orgId, name: 'Priya Sharma',        email: 'inventory@bhel.in',    password_hash: hash, role: 'inventory_manager', department: 'Stores', phone: '+91-9876543211', is_active: true },
    { id: qualMgrId,    org_id: orgId, name: 'Amit Verma',          email: 'quality@bhel.in',      password_hash: hash, role: 'quality_manager', department: 'Quality Control', phone: '+91-9876543212', is_active: true },
    { id: whMgrId,      org_id: orgId, name: 'Sunita Patel',        email: 'warehouse@bhel.in',    password_hash: hash, role: 'warehouse_manager', department: 'Warehouse', phone: '+91-9876543213', is_active: true },
    { id: storeKeepId,  org_id: orgId, name: 'Vikram Singh',        email: 'storekeeper@bhel.in',  password_hash: hash, role: 'store_keeper', department: 'Stores', phone: '+91-9876543214', is_active: true },
    { id: viewerId,     org_id: orgId, name: 'Ananya Gupta',        email: 'viewer@bhel.in',       password_hash: hash, role: 'viewer', department: 'Finance', phone: '+91-9876543215', is_active: true },
    { id: matTeamId,    org_id: orgId, name: 'Deepak Mehta',        email: 'material@bhel.in',     password_hash: hash, role: 'material_team', department: 'Material Management', phone: '+91-9876543216', is_active: true },
    { id: dtgTeamId,    org_id: orgId, name: 'Kavitha Rangan',      email: 'dtg@bhel.in',          password_hash: hash, role: 'dtg_team', department: 'DTG', phone: '+91-9876543217', is_active: true },
  ]);

  // ── Default Workflow ─────────────────────────────────────────────────────────
  const workflowId = uuidv4();
  await knex('workflows').insert({
    id: workflowId,
    org_id: orgId,
    name: 'Standard Material Workflow',
    is_default: true,
    stages: JSON.stringify([
      { id: 'received',     name: 'Received',     color: '#6366f1', order: 1 },
      { id: 'under_review', name: 'Under Review', color: '#f59e0b', order: 2 },
      { id: 'quality_check',name: 'Quality Check',color: '#8b5cf6', order: 3 },
      { id: 'approved',     name: 'Approved',     color: '#10b981', order: 4 },
      { id: 'stored',       name: 'Stored',       color: '#3b82f6', order: 5 },
      { id: 'issued',       name: 'Issued',       color: '#ef4444', order: 6 },
    ]),
  });

  // ── Vendors ──────────────────────────────────────────────────────────────────
  const vendorIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  await knex('vendors').insert([
    { id: vendorIds[0], org_id: orgId, name: 'Tata Steel Ltd',     contact_person: 'Ramesh Singh',   email: 'supply@tatasteel.com', phone: '+91-22-66583666', rating: 4.5, address: 'Bombay House, 24 Homi Mody St, Mumbai', status: 'active' },
    { id: vendorIds[1], org_id: orgId, name: 'Larsen & Toubro',    contact_person: 'Meera Joshi',    email: 'procurement@lnt.com',  phone: '+91-22-67525656', rating: 4.2, address: 'L&T House, N.M. Marg, Ballard Estate, Mumbai', status: 'active' },
    { id: vendorIds[2], org_id: orgId, name: 'Siemens India',      contact_person: 'Hans Mueller',   email: 'india@siemens.com',    phone: '+91-22-62220000', rating: 4.8, address: 'Siemens House, Worli, Mumbai', status: 'active' },
    { id: vendorIds[3], org_id: orgId, name: 'ABB India Ltd',      contact_person: 'Suresh Nair',    email: 'supply@abb.in',        phone: '+91-80-22943000', rating: 4.3, address: 'Cunningham Road, Bengaluru', status: 'active' },
    { id: vendorIds[4], org_id: orgId, name: 'Kirloskar Electric', contact_person: 'Anand Kirloskar',email: 'sales@kirloskar.com',  phone: '+91-80-23375171', rating: 3.9, address: 'Kirloskar Electric, Bengaluru', status: 'active' },
  ]);

  // ── Warehouses ───────────────────────────────────────────────────────────────
  const wh1Id = uuidv4(), wh2Id = uuidv4();
  await knex('warehouses').insert([
    { id: wh1Id, org_id: orgId, name: 'Main Warehouse - Block A',      address: 'BHEL Plant Area, Block A, Haridwar', manager_name: 'Sunita Patel',  manager_phone: '+91-9876543213', zones: JSON.stringify(['Zone-A','Zone-B','Zone-C','Zone-D']), is_active: true },
    { id: wh2Id, org_id: orgId, name: 'Secondary Warehouse - Block B', address: 'BHEL Plant Area, Block B, Haridwar', manager_name: 'Vikram Singh',  manager_phone: '+91-9876543214', zones: JSON.stringify(['Zone-X','Zone-Y']), is_active: true },
  ]);

  // ── Locations ────────────────────────────────────────────────────────────────
  const locationRows = [];
  const locIds = [];
  ['Zone-A', 'Zone-B', 'Zone-C'].forEach(zone => {
    ['R1', 'R2', 'R3'].forEach(rack => {
      ['S1', 'S2'].forEach(shelf => {
        const lid = uuidv4();
        locIds.push(lid);
        locationRows.push({ id: lid, warehouse_id: wh1Id, zone, rack, shelf, capacity: 500, unit: 'pcs' });
      });
    });
  });
  await knex('locations').insert(locationRows);

  // ── Materials ────────────────────────────────────────────────────────────────
  const matIds = Array.from({ length: 10 }, () => uuidv4());
  await knex('materials').insert([
    { id: matIds[0], org_id: orgId, material_id: 'MAT-0001', name: 'Copper Cable 25mm²',         category: 'Electrical',          sku: 'CC-25-001',   vendor_id: vendorIds[2], quantity: 500,   unit: 'meters', cost: 185,    total_value: 92500,   location_id: locIds[0], status: 'stored',        min_stock_level: 100, reorder_level: 200, workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[1], org_id: orgId, material_id: 'MAT-0002', name: 'High Tension Transformer 11kV',category: 'Electrical Equipment',sku: 'HT-11K-001', vendor_id: vendorIds[0], quantity: 5,     unit: 'units',  cost: 285000, total_value: 1425000, location_id: locIds[1], status: 'quality_check', min_stock_level: 2,   reorder_level: 3,   workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[2], org_id: orgId, material_id: 'MAT-0003', name: 'MS Plate 10mm',               category: 'Raw Material',        sku: 'MS-10-001',   vendor_id: vendorIds[0], quantity: 200,   unit: 'tons',   cost: 52000,  total_value: 10400000,location_id: locIds[2], status: 'approved',      min_stock_level: 50,  reorder_level: 100, workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[3], org_id: orgId, material_id: 'MAT-0004', name: 'Stainless Steel Bolts M16',   category: 'Fasteners',           sku: 'SS-M16-001',  vendor_id: vendorIds[1], quantity: 10000, unit: 'pcs',    cost: 25,     total_value: 250000,  location_id: locIds[3], status: 'stored',        min_stock_level: 2000,reorder_level: 5000,workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[4], org_id: orgId, material_id: 'MAT-0005', name: 'Industrial Motor 37kW',       category: 'Mechanical',          sku: 'IM-37K-001',  vendor_id: vendorIds[4], quantity: 8,     unit: 'units',  cost: 145000, total_value: 1160000, location_id: locIds[4], status: 'stored',        min_stock_level: 2,   reorder_level: 4,   workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[5], org_id: orgId, material_id: 'MAT-0006', name: 'PLC Control Panel',           category: 'Automation',          sku: 'PLC-001',     vendor_id: vendorIds[2], quantity: 3,     unit: 'units',  cost: 385000, total_value: 1155000, location_id: locIds[5], status: 'received',      min_stock_level: 1,   reorder_level: 2,   workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[6], org_id: orgId, material_id: 'MAT-0007', name: 'Hydraulic Oil ISO 46',        category: 'Consumables',         sku: 'HO-46-001',   vendor_id: vendorIds[3], quantity: 50,    unit: 'liters', cost: 320,    total_value: 16000,   location_id: locIds[6], status: 'stored',        min_stock_level: 20,  reorder_level: 40,  workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[7], org_id: orgId, material_id: 'MAT-0008', name: 'Safety Helmets ISI Mark',     category: 'Safety Equipment',    sku: 'SH-ISI-001',  vendor_id: vendorIds[1], quantity: 45,    unit: 'pcs',    cost: 350,    total_value: 15750,   location_id: locIds[7], status: 'stored',        min_stock_level: 50,  reorder_level: 75,  workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[8], org_id: orgId, material_id: 'MAT-0009', name: 'Bearing SKF 6308',            category: 'Mechanical',          sku: 'BR-6308-001', vendor_id: vendorIds[3], quantity: 120,   unit: 'pcs',    cost: 1850,   total_value: 222000,  location_id: locIds[8], status: 'approved',      min_stock_level: 30,  reorder_level: 60,  workflow_id: workflowId, created_by: invMgrId },
    { id: matIds[9], org_id: orgId, material_id: 'MAT-0010', name: 'Welding Electrodes E7018',    category: 'Consumables',         sku: 'WE-7018-001', vendor_id: vendorIds[0], quantity: 500,   unit: 'kg',     cost: 280,    total_value: 140000,  location_id: locIds[9], status: 'stored',        min_stock_level: 100, reorder_level: 200, workflow_id: workflowId, created_by: invMgrId },
  ]);

  // ── Quality Inspections ──────────────────────────────────────────────────────
  await knex('quality_inspections').insert([
    { id: uuidv4(), org_id: orgId, material_id: matIds[1], inspection_number: 'QI-2024-001', inspector_id: qualMgrId, result: 'pending',     notes: 'Awaiting dimensional verification', quantity_inspected: 5,   quantity_passed: 0,   quantity_failed: 0, checklist: '[]' },
    { id: uuidv4(), org_id: orgId, material_id: matIds[0], inspection_number: 'QI-2024-002', inspector_id: qualMgrId, result: 'pass',        notes: 'All parameters within spec',         quantity_inspected: 500, quantity_passed: 498, quantity_failed: 2, checklist: '[]', inspected_at: new Date().toISOString() },
    { id: uuidv4(), org_id: orgId, material_id: matIds[2], inspection_number: 'QI-2024-003', inspector_id: qualMgrId, result: 'pass',        notes: 'Thickness verified, surface good',   quantity_inspected: 200, quantity_passed: 200, quantity_failed: 0, checklist: '[]', inspected_at: new Date().toISOString() },
    { id: uuidv4(), org_id: orgId, material_id: matIds[5], inspection_number: 'QI-2024-004', inspector_id: qualMgrId, result: 'conditional', notes: 'Minor cosmetic defects, functional',  quantity_inspected: 3,   quantity_passed: 2,   quantity_failed: 1, checklist: '[]', inspected_at: new Date().toISOString() },
  ]);

  // ── Inventory Transactions ───────────────────────────────────────────────────
  await knex('inventory_transactions').insert([
    { id: uuidv4(), org_id: orgId, material_id: matIds[0], type: 'stock_in',  quantity: 500,   unit_cost: 185,   reference_number: 'GRN-2024-001', notes: 'Initial stock receipt', created_by: invMgrId, to_location_id: locIds[0] },
    { id: uuidv4(), org_id: orgId, material_id: matIds[3], type: 'stock_in',  quantity: 10000, unit_cost: 25,    reference_number: 'GRN-2024-002', notes: 'Bulk fastener purchase', created_by: invMgrId, to_location_id: locIds[3] },
    { id: uuidv4(), org_id: orgId, material_id: matIds[0], type: 'stock_out', quantity: 50,    reference_number: 'ISS-2024-001', notes: 'Issued to Assembly Line 3', created_by: invMgrId, from_location_id: locIds[0] },
    { id: uuidv4(), org_id: orgId, material_id: matIds[6], type: 'stock_out', quantity: 10,    reference_number: 'ISS-2024-002', notes: 'Maintenance department request', created_by: storeKeepId, from_location_id: locIds[6] },
  ]);

  // ── Purchase Orders ──────────────────────────────────────────────────────────
  const po1Id = uuidv4(), po2Id = uuidv4();
  await knex('purchase_orders').insert([
    { id: po1Id, org_id: orgId, po_number: 'PO-2024-001', vendor_id: vendorIds[2], status: 'received', subtotal: 92500,   tax: 16650, discount: 0, total: 109150, order_date: '2024-01-15', expected_delivery: '2024-02-15', created_by: invMgrId, notes: 'Urgent requirement for Assembly Line' },
    { id: po2Id, org_id: orgId, po_number: 'PO-2024-002', vendor_id: vendorIds[0], status: 'sent',     subtotal: 1425000, tax: 256500,discount: 0, total: 1681500,order_date: '2024-03-01', expected_delivery: '2024-04-15', created_by: invMgrId, notes: 'Annual transformer procurement' },
  ]);

  await knex('po_items').insert([
    { id: uuidv4(), po_id: po1Id, material_id: matIds[0], description: 'Copper Cable 25mm²',          quantity: 500, unit: 'meters', unit_price: 185,    total: 92500,   received_qty: 500 },
    { id: uuidv4(), po_id: po2Id, material_id: matIds[1], description: 'High Tension Transformer 11kV', quantity: 5,   unit: 'units',  unit_price: 285000, total: 1425000, received_qty: 0 },
  ]);

  // ── Movements ────────────────────────────────────────────────────────────────
  await knex('movements').insert([
    { id: uuidv4(), org_id: orgId, material_id: matIds[0], from_warehouse: 'Secondary Warehouse - Block B', to_warehouse: 'Main Warehouse - Block A', department: 'Stores',   reason: 'Transfer for storage consolidation',    moved_by: whMgrId },
    { id: uuidv4(), org_id: orgId, material_id: matIds[6], from_warehouse: 'Main Warehouse - Block A',      to_warehouse: null,                          department: 'Maintenance', reason: 'Issued to maintenance team',           moved_by: storeKeepId },
  ]);

  // ── Notifications ────────────────────────────────────────────────────────────
  await knex('notifications').insert([
    { id: uuidv4(), org_id: orgId, user_id: invMgrId,  type: 'low_stock',         title: 'Low Stock Alert',           body: 'Safety Helmets ISI Mark is below minimum stock level (45 < 50)',      entity_type: 'material',        entity_id: matIds[7],  is_read: false },
    { id: uuidv4(), org_id: orgId, user_id: qualMgrId, type: 'inspection_pending',title: 'Inspection Required',       body: 'High Tension Transformer 11kV requires quality inspection',            entity_type: 'material',        entity_id: matIds[1],  is_read: false },
    { id: uuidv4(), org_id: orgId, user_id: invMgrId,  type: 'po_received',       title: 'Purchase Order Received',   body: 'PO-2024-001 from Siemens India has been fully received',               entity_type: 'purchase_order',  entity_id: po1Id,      is_read: true  },
    { id: uuidv4(), org_id: orgId, user_id: whMgrId,   type: 'material_received', title: 'Materials Transferred',     body: 'Copper Cable 25mm² transferred to Main Warehouse',                    entity_type: 'movement',        entity_id: null,       is_read: false },
    { id: uuidv4(), org_id: orgId, user_id: matTeamId, type: 'cnote_arrival',     title: 'C-Note Arrival',            body: 'CN-2024-0004: Stainless Steel Bolts M16 in transit from L&T',          entity_type: 'cnote',           entity_id: null,       is_read: false },
    { id: uuidv4(), org_id: orgId, user_id: dtgTeamId, type: 'siv_pending',       title: 'SIV Approval Needed',       body: 'SIV-2024-0004: Safety Helmets ISI Mark — awaiting approval',           entity_type: 'siv',             entity_id: null,       is_read: false },
  ]);

  // ── Consignment Notes (C-Notes) ──────────────────────────────────────────────
  const cnoteTableExists = await knex.schema.hasTable('consignment_notes');
  if (cnoteTableExists) {
    await knex('consignment_notes').insert([
      { id: uuidv4(), org_id: orgId, cnote_number: 'CN-2024-0001', vendor_id: vendorIds[0], vendor_name: 'Tata Steel Ltd',   vendor_code: 'V-TATA',  material_id: matIds[2], material_name: 'MS Plate 10mm',               quantity: 200, unit: 'tons',   transporter_name: 'Blue Dart Logistics',  vehicle_number: 'MH-01-AB-1234', dispatch_date: '2024-01-10', arrival_date: '2024-01-15', po_number: 'PO-2024-002', invoice_number: 'INV-TATA-2024-001', status: 'received', remarks: 'All plates received in good condition',     created_by: matTeamId },
      { id: uuidv4(), org_id: orgId, cnote_number: 'CN-2024-0002', vendor_id: vendorIds[2], vendor_name: 'Siemens India',    vendor_code: 'V-SIEM',  material_id: matIds[0], material_name: 'Copper Cable 25mm²',          quantity: 500, unit: 'meters', transporter_name: 'DHL Express India',    vehicle_number: 'DL-05-CD-5678', dispatch_date: '2024-01-12', arrival_date: '2024-01-16', po_number: 'PO-2024-001', invoice_number: 'INV-SIEM-2024-001', status: 'verified',  remarks: 'Cable quality verified by QC',              created_by: matTeamId },
      { id: uuidv4(), org_id: orgId, cnote_number: 'CN-2024-0003', vendor_id: vendorIds[3], vendor_name: 'ABB India Ltd',    vendor_code: 'V-ABB',   material_id: matIds[8], material_name: 'Bearing SKF 6308',            quantity: 120, unit: 'pcs',    transporter_name: 'Gati Logistics',       vehicle_number: 'KA-03-EF-9012', dispatch_date: '2024-02-01', arrival_date: '2024-02-05', po_number: '',             invoice_number: 'INV-ABB-2024-010',  status: 'received', remarks: 'Bearings packed well, no damage',            created_by: matTeamId },
      { id: uuidv4(), org_id: orgId, cnote_number: 'CN-2024-0004', vendor_id: vendorIds[1], vendor_name: 'Larsen & Toubro',  vendor_code: 'V-LNT',   material_id: matIds[3], material_name: 'Stainless Steel Bolts M16',   quantity: 5000,unit: 'pcs',    transporter_name: 'Delhivery',            vehicle_number: 'MH-12-GH-3456', dispatch_date: '2024-02-10', arrival_date: null,           po_number: '',             invoice_number: 'INV-LNT-2024-005',  status: 'in_transit', remarks: 'Dispatched, expected in 3 days',             created_by: matTeamId },
      { id: uuidv4(), org_id: orgId, cnote_number: 'CN-2024-0005', vendor_id: vendorIds[4], vendor_name: 'Kirloskar Electric',vendor_code: 'V-KIRL', material_id: matIds[4], material_name: 'Industrial Motor 37kW',       quantity: 2,   unit: 'units',  transporter_name: 'Rivigo Freight',       vehicle_number: 'KA-01-IJ-7890', dispatch_date: '2024-03-01', arrival_date: '2024-03-06', po_number: '',             invoice_number: 'INV-KIRL-2024-002', status: 'draft',    remarks: 'Awaiting dispatch confirmation',             created_by: matTeamId },
    ]);
  }

  // ── Store Issue Vouchers (SIVs) ──────────────────────────────────────────────
  const sivTableExists = await knex.schema.hasTable('store_issue_vouchers');
  if (sivTableExists) {
    await knex('store_issue_vouchers').insert([
      { id: uuidv4(), org_id: orgId, siv_number: 'SIV-2024-0001', material_id: matIds[0], material_name: 'Copper Cable 25mm²',      department: 'Assembly Line 3',   requested_by: 'Ravi Kumar',    approved_by: orgAdminId, approved_by_name: 'Rajesh Kumar', quantity_issued: 50,  date_issued: '2024-01-20', remarks: 'Required for transformer winding',  status: 'issued',   created_by: dtgTeamId },
      { id: uuidv4(), org_id: orgId, siv_number: 'SIV-2024-0002', material_id: matIds[6], material_name: 'Hydraulic Oil ISO 46',    department: 'Maintenance',       requested_by: 'Suresh Patil',  approved_by: orgAdminId, approved_by_name: 'Rajesh Kumar', quantity_issued: 10,  date_issued: '2024-01-25', remarks: 'Routine machine maintenance',      status: 'issued',   created_by: dtgTeamId },
      { id: uuidv4(), org_id: orgId, siv_number: 'SIV-2024-0003', material_id: matIds[9], material_name: 'Welding Electrodes E7018',department: 'Fabrication Shop',  requested_by: 'Ajay Yadav',    approved_by: orgAdminId, approved_by_name: 'Rajesh Kumar', quantity_issued: 100, date_issued: '2024-02-01', remarks: 'Welding work on turbine housing',   status: 'approved', created_by: dtgTeamId },
      { id: uuidv4(), org_id: orgId, siv_number: 'SIV-2024-0004', material_id: matIds[7], material_name: 'Safety Helmets ISI Mark', department: 'Safety Department', requested_by: 'Meena Deshpande',approved_by: null,      approved_by_name: null,           quantity_issued: 20,  date_issued: null,         remarks: 'New batch of contract workers',     status: 'pending',  created_by: dtgTeamId },
      { id: uuidv4(), org_id: orgId, siv_number: 'SIV-2024-0005', material_id: matIds[3], material_name: 'Stainless Steel Bolts M16',department: 'Assembly Line 1',  requested_by: 'Harish Chandra',approved_by: null,      approved_by_name: null,           quantity_issued: 500, date_issued: null,         remarks: 'Boiler assembly requirement',       status: 'pending',  created_by: dtgTeamId },
    ]);
  }

  console.log('\n✅ Seed data inserted successfully');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   🔑 Login Credentials (password: Admin@123)');
  console.log('   Super Admin:       superadmin@smimp.com');
  console.log('   Org Admin:         admin@bhel.in');
  console.log('   Inventory Manager: inventory@bhel.in');
  console.log('   Quality Manager:   quality@bhel.in');
  console.log('   Warehouse Manager: warehouse@bhel.in');
  console.log('   Store Keeper:      storekeeper@bhel.in');
  console.log('   Viewer:            viewer@bhel.in');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
};

// Required by knex migrate — no-op for seed data
exports.down = async function (knex) {};
