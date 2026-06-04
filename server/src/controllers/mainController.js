const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const isSQLite = () => db.client.config.client === 'better-sqlite3';

/** Generic paginator */
const paginate = (q, page, limit) => q.limit(+limit).offset((+page - 1) * +limit);

/** SQLite-safe insert that returns the created row */
async function insertAndFetch(table, data, idField = 'id') {
  const id = data[idField] || uuidv4();
  const row = { ...data, [idField]: id };
  await db(table).insert(row);
  return db(table).where({ [idField]: id }).first();
}

/** SQLite-safe update that returns the updated row */
async function updateAndFetch(table, where, data) {
  await db(table).where(where).update(data);
  return db(table).where(where).first();
}

// Parse JSON text fields that SQLite stores as text
function parseJsonFields(row, fields) {
  if (!row || !isSQLite()) return row;
  const copy = { ...row };
  for (const f of fields) {
    if (typeof copy[f] === 'string') {
      try { copy[f] = JSON.parse(copy[f]); } catch { copy[f] = null; }
    }
  }
  return copy;
}

// ─── Vendors ─────────────────────────────────────────────────────────────────
exports.getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    let q = db('vendors').where({ org_id: req.user.org_id });
    if (search) q = q.where(function () { this.where('name', 'like', `%${search}%`).orWhere('email', 'like', `%${search}%`); });
    if (status) q = q.where({ status });
    const total = await q.clone().count('id as c').first();
    const data = await paginate(q.orderBy('name'), page, limit);
    res.json({ data, total: +total.c });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch vendors' }); }
};

exports.getVendor = async (req, res) => {
  try {
    const vendor = await db('vendors').where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    const materials = await db('materials').where({ vendor_id: vendor.id }).select('id', 'material_id', 'name', 'status', 'quantity', 'unit');
    const pos = await db('purchase_orders').where({ vendor_id: vendor.id }).orderBy('created_at', 'desc').limit(10);
    res.json({ ...vendor, materials, purchase_orders: pos });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch vendor' }); }
};

exports.createVendor = async (req, res) => {
  try {
    const v = await insertAndFetch('vendors', { ...req.body, id: uuidv4(), org_id: req.user.org_id });
    res.status(201).json(v);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create vendor' }); }
};

exports.updateVendor = async (req, res) => {
  try {
    const existing = await db('vendors').where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'Vendor not found' });
    req._prevValue = existing;
    const v = await updateAndFetch('vendors', { id: req.params.id }, { ...req.body, updated_at: new Date().toISOString() });
    res.json(v);
  } catch (e) { res.status(500).json({ error: 'Failed to update vendor' }); }
};

exports.deleteVendor = async (req, res) => {
  try {
    const existing = await db('vendors').where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'Vendor not found' });
    req._prevValue = existing;
    await db('vendors').where({ id: req.params.id }).delete();
    res.json({ message: 'Vendor deleted' });
  } catch (e) { res.status(500).json({ error: 'Failed to delete vendor' }); }
};

// ─── Warehouses ───────────────────────────────────────────────────────────────
exports.getAllWarehouses = async (req, res) => {
  try {
    const wh = await db('warehouses').where({ org_id: req.user.org_id }).orderBy('name');
    const whWithStats = await Promise.all(wh.map(async (w) => {
      const locCount = await db('locations').where({ warehouse_id: w.id }).count('id as c').first();
      const matCount = await db('materials').join('locations', 'materials.location_id', 'locations.id').where({ 'locations.warehouse_id': w.id }).count('materials.id as c').first();
      return { ...parseJsonFields(w, ['zones']), location_count: +locCount.c, material_count: +matCount.c };
    }));
    res.json(whWithStats);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch warehouses' }); }
};

exports.getWarehouse = async (req, res) => {
  try {
    const wh = await db('warehouses').where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });
    const locs = await db('locations').where({ warehouse_id: wh.id });
    const materials = await db('materials').join('locations', 'materials.location_id', 'locations.id').where({ 'locations.warehouse_id': wh.id }).select('materials.*', 'locations.zone', 'locations.rack', 'locations.shelf');
    res.json({ ...parseJsonFields(wh, ['zones']), locations: locs, materials });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch warehouse' }); }
};

exports.createWarehouse = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.zones && typeof body.zones !== 'string') body.zones = JSON.stringify(body.zones);
    const w = await insertAndFetch('warehouses', { ...body, id: uuidv4(), org_id: req.user.org_id });
    res.status(201).json(parseJsonFields(w, ['zones']));
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create warehouse' }); }
};

exports.updateWarehouse = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.zones && typeof body.zones !== 'string') body.zones = JSON.stringify(body.zones);
    const w = await updateAndFetch('warehouses', { id: req.params.id, org_id: req.user.org_id }, { ...body, updated_at: new Date().toISOString() });
    if (!w) return res.status(404).json({ error: 'Warehouse not found' });
    res.json(parseJsonFields(w, ['zones']));
  } catch (e) { res.status(500).json({ error: 'Failed to update warehouse' }); }
};

exports.createLocation = async (req, res) => {
  try {
    const wh = await db('warehouses').where({ id: req.params.warehouseId, org_id: req.user.org_id }).first();
    if (!wh) return res.status(404).json({ error: 'Warehouse not found' });
    const loc = await insertAndFetch('locations', { ...req.body, id: uuidv4(), warehouse_id: req.params.warehouseId });
    res.status(201).json(loc);
  } catch (e) { res.status(500).json({ error: 'Failed to create location' }); }
};

// ─── Inventory Transactions ────────────────────────────────────────────────────
exports.getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, material_id, type } = req.query;
    let q = db('inventory_transactions')
      .where({ 'inventory_transactions.org_id': req.user.org_id })
      .leftJoin('materials', 'inventory_transactions.material_id', 'materials.id')
      .leftJoin('users', 'inventory_transactions.created_by', 'users.id')
      .select('inventory_transactions.*', 'materials.name as material_name', 'materials.material_id as mat_id', 'users.name as created_by_name');
    if (material_id) q = q.where({ 'inventory_transactions.material_id': material_id });
    if (type) q = q.where({ 'inventory_transactions.type': type });
    const total = await q.clone().clearSelect().count('inventory_transactions.id as c').first();
    const data = await q.orderBy('inventory_transactions.created_at', 'desc').limit(+limit).offset((+page - 1) * +limit);
    res.json({ data, total: +total.c });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch transactions' }); }
};

exports.createTransaction = async (req, res) => {
  try {
    const { material_id, type, quantity, from_location_id, to_location_id, notes, reference_number, unit_cost } = req.body;
    const material = await db('materials').where({ id: material_id, org_id: req.user.org_id }).first();
    if (!material) return res.status(404).json({ error: 'Material not found' });

    let newQty = +material.quantity;
    if (type === 'stock_in' || type === 'return') newQty += +quantity;
    else if (type === 'stock_out' || type === 'disposal') {
      if (newQty < +quantity) return res.status(400).json({ error: 'Insufficient stock' });
      newQty -= +quantity;
    } else if (type === 'adjustment') {
      newQty = +quantity;
    }

    const updateData = { quantity: newQty, total_value: newQty * +material.cost };
    if (to_location_id) updateData.location_id = to_location_id;
    await db('materials').where({ id: material_id }).update(updateData);

    const txn = await insertAndFetch('inventory_transactions', {
      id: uuidv4(), org_id: req.user.org_id, material_id, type, quantity, from_location_id,
      to_location_id, notes, reference_number, unit_cost, created_by: req.user.id,
    });

    if (newQty <= +material.min_stock_level && +material.min_stock_level > 0) {
      await db('notifications').insert({
        id: uuidv4(), org_id: req.user.org_id, user_id: req.user.id,
        type: 'low_stock', title: 'Low Stock Alert',
        body: `${material.name} stock is critically low (${newQty} ${material.unit})`,
        entity_type: 'material', entity_id: material_id, is_read: false,
      });
    }
    res.status(201).json(txn);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Transaction failed' }); }
};

// ─── Quality Inspections ───────────────────────────────────────────────────────
exports.getInspections = async (req, res) => {
  try {
    const { page = 1, limit = 20, result, material_id } = req.query;
    let q = db('quality_inspections')
      .where({ 'quality_inspections.org_id': req.user.org_id })
      .leftJoin('materials', 'quality_inspections.material_id', 'materials.id')
      .leftJoin('users', 'quality_inspections.inspector_id', 'users.id')
      .select('quality_inspections.*', 'materials.name as material_name', 'materials.material_id as mat_id', 'users.name as inspector_name');
    if (result) q = q.where({ 'quality_inspections.result': result });
    if (material_id) q = q.where({ 'quality_inspections.material_id': material_id });
    const total = await q.clone().clearSelect().count('quality_inspections.id as c').first();
    const data = await q.orderBy('quality_inspections.created_at', 'desc').limit(+limit).offset((+page - 1) * +limit);
    res.json({ data, total: +total.c });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch inspections' }); }
};

exports.createInspection = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const count = await db('quality_inspections').where({ org_id: orgId }).count('id as c').first();
    const inspectionNumber = `QI-${new Date().getFullYear()}-${String(+count.c + 1).padStart(4, '0')}`;
    const body = { ...req.body };
    if (body.checklist && typeof body.checklist !== 'string') body.checklist = JSON.stringify(body.checklist);
    const insp = await insertAndFetch('quality_inspections', {
      ...body, id: uuidv4(), org_id: orgId, inspection_number: inspectionNumber, inspector_id: req.user.id,
    });
    res.status(201).json(insp);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create inspection' }); }
};

exports.updateInspection = async (req, res) => {
  try {
    const updated = await updateAndFetch('quality_inspections', { id: req.params.id, org_id: req.user.org_id }, {
      ...req.body,
      inspected_at: req.body.result !== 'pending' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: 'Inspection not found' });
    if (req.body.result === 'pass') {
      await db('materials').where({ id: updated.material_id }).update({ status: 'approved' });
    } else if (req.body.result === 'fail') {
      await db('materials').where({ id: updated.material_id }).update({ status: 'rejected' });
      await db('notifications').insert({ id: uuidv4(), org_id: req.user.org_id, user_id: req.user.id, type: 'inspection_failed', title: 'Inspection Failed', body: `Inspection ${updated.inspection_number} has failed`, entity_type: 'inspection', entity_id: updated.id, is_read: false });
    }
    res.json(updated);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update inspection' }); }
};

// ─── Purchase Orders ────────────────────────────────────────────────────────────
exports.getAllPOs = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, vendor_id } = req.query;
    let q = db('purchase_orders')
      .where({ 'purchase_orders.org_id': req.user.org_id })
      .leftJoin('vendors', 'purchase_orders.vendor_id', 'vendors.id')
      .leftJoin('users', 'purchase_orders.created_by', 'users.id')
      .select('purchase_orders.*', 'vendors.name as vendor_name', 'users.name as created_by_name');
    if (status) q = q.where({ 'purchase_orders.status': status });
    if (vendor_id) q = q.where({ 'purchase_orders.vendor_id': vendor_id });
    const total = await q.clone().clearSelect().count('purchase_orders.id as c').first();
    const data = await q.orderBy('purchase_orders.created_at', 'desc').limit(+limit).offset((+page - 1) * +limit);
    res.json({ data, total: +total.c });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch purchase orders' }); }
};

exports.getPO = async (req, res) => {
  try {
    const po = await db('purchase_orders')
      .where({ 'purchase_orders.id': req.params.id, 'purchase_orders.org_id': req.user.org_id })
      .leftJoin('vendors', 'purchase_orders.vendor_id', 'vendors.id')
      .select('purchase_orders.*', 'vendors.name as vendor_name', 'vendors.email as vendor_email', 'vendors.phone as vendor_phone', 'vendors.address as vendor_address')
      .first();
    if (!po) return res.status(404).json({ error: 'PO not found' });
    const items = await db('po_items').where({ po_id: po.id }).leftJoin('materials', 'po_items.material_id', 'materials.id').select('po_items.*', 'materials.name as material_name');
    res.json({ ...po, items });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch PO' }); }
};

exports.createPO = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const count = await db('purchase_orders').where({ org_id: orgId }).count('id as c').first();
    const poNumber = `PO-${new Date().getFullYear()}-${String(+count.c + 1).padStart(4, '0')}`;
    const { items, ...poData } = req.body;
    const poId = uuidv4();
    const po = await insertAndFetch('purchase_orders', { ...poData, id: poId, org_id: orgId, po_number: poNumber, created_by: req.user.id });
    if (items?.length) {
      await db('po_items').insert(items.map((i) => ({ ...i, id: uuidv4(), po_id: poId })));
    }
    res.status(201).json(po);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create PO' }); }
};

exports.updatePO = async (req, res) => {
  try {
    const { items, ...poData } = req.body;
    const po = await updateAndFetch('purchase_orders', { id: req.params.id, org_id: req.user.org_id }, { ...poData, updated_at: new Date().toISOString() });
    if (!po) return res.status(404).json({ error: 'PO not found' });
    res.json(po);
  } catch (e) { res.status(500).json({ error: 'Failed to update PO' }); }
};

// ─── Movements ─────────────────────────────────────────────────────────────────
exports.getMovements = async (req, res) => {
  try {
    const { page = 1, limit = 20, material_id } = req.query;
    let q = db('movements')
      .where({ 'movements.org_id': req.user.org_id })
      .leftJoin('materials', 'movements.material_id', 'materials.id')
      .leftJoin('users', 'movements.moved_by', 'users.id')
      .select('movements.*', 'materials.name as material_name', 'materials.material_id as mat_id', 'users.name as moved_by_name');
    if (material_id) q = q.where({ 'movements.material_id': material_id });
    const total = await q.clone().clearSelect().count('movements.id as c').first();
    const data = await q.orderBy('movements.moved_at', 'desc').limit(+limit).offset((+page - 1) * +limit);
    res.json({ data, total: +total.c });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch movements' }); }
};

exports.createMovement = async (req, res) => {
  try {
    const mv = await insertAndFetch('movements', { ...req.body, id: uuidv4(), org_id: req.user.org_id, moved_by: req.user.id });
    if (req.body.to_location_id) {
      await db('materials').where({ id: req.body.material_id }).update({ location_id: req.body.to_location_id });
    }
    res.status(201).json(mv);
  } catch (e) { res.status(500).json({ error: 'Failed to create movement' }); }
};

// ─── Notifications ─────────────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const notifs = await db('notifications').where({ user_id: req.user.id }).orderBy('created_at', 'desc').limit(50);
    const unread = notifs.filter((n) => !n.is_read).length;
    res.json({ data: notifs, unread });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch notifications' }); }
};

exports.markRead = async (req, res) => {
  try {
    await db('notifications').where({ user_id: req.user.id, id: req.params.id }).update({ is_read: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to mark notification' }); }
};

exports.markAllRead = async (req, res) => {
  try {
    await db('notifications').where({ user_id: req.user.id }).update({ is_read: true });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Failed to mark all notifications' }); }
};

// ─── Audit Logs ────────────────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entity_type, user_id } = req.query;
    let q = db('audit_logs').where({ org_id: req.user.org_id });
    if (action) q = q.where({ action });
    if (entity_type) q = q.where({ entity_type });
    if (user_id) q = q.where({ user_id });
    const total = await q.clone().count('id as c').first();
    const data = await q.orderBy('timestamp', 'desc').limit(+limit).offset((+page - 1) * +limit);
    res.json({ data, total: +total.c });
  } catch (e) { res.status(500).json({ error: 'Failed to fetch audit logs' }); }
};

// ─── Global Search ─────────────────────────────────────────────────────────────
exports.globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ results: [] });
    const orgId = req.user.org_id;
    const [materials, vendors, pos] = await Promise.all([
      db('materials').where({ org_id: orgId }).where(function () { this.where('name', 'like', `%${q}%`).orWhere('material_id', 'like', `%${q}%`).orWhere('sku', 'like', `%${q}%`); }).limit(5).select('id', 'material_id', 'name', 'status', 'category'),
      db('vendors').where({ org_id: orgId }).where('name', 'like', `%${q}%`).limit(5).select('id', 'name', 'email', 'status'),
      db('purchase_orders').where({ org_id: orgId }).where('po_number', 'like', `%${q}%`).limit(5).select('id', 'po_number', 'status', 'total'),
    ]);
    res.json({
      results: [
        ...materials.map((m) => ({ type: 'material', id: m.id, title: m.name, subtitle: m.material_id, status: m.status, category: m.category })),
        ...vendors.map((v) => ({ type: 'vendor', id: v.id, title: v.name, subtitle: v.email, status: v.status })),
        ...pos.map((p) => ({ type: 'purchase_order', id: p.id, title: p.po_number, subtitle: `₹${p.total}`, status: p.status })),
      ],
    });
  } catch (e) { res.status(500).json({ error: 'Search failed' }); }
};

// ─── Dashboard ─────────────────────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const [
      totalMaterials, inventoryValue, lowStockCount, pendingInspections,
      totalVendors, totalWarehouses, activePOs,
      recentMaterials, recentTransactions, categoryBreakdown, qualityStats,
    ] = await Promise.all([
      db('materials').where({ org_id: orgId }).count('id as c').first(),
      db('materials').where({ org_id: orgId }).sum('total_value as v').first(),
      db('materials').where({ org_id: orgId }).whereRaw('quantity <= min_stock_level AND min_stock_level > 0').count('id as c').first(),
      db('quality_inspections').where({ org_id: orgId, result: 'pending' }).count('id as c').first(),
      db('vendors').where({ org_id: orgId }).count('id as c').first(),
      db('warehouses').where({ org_id: orgId }).count('id as c').first(),
      db('purchase_orders').where({ org_id: orgId }).whereIn('status', ['draft', 'sent', 'acknowledged', 'partial']).count('id as c').first(),
      db('materials').where({ org_id: orgId }).orderBy('created_at', 'desc').limit(5),
      db('inventory_transactions').where({ 'inventory_transactions.org_id': orgId }).orderBy('inventory_transactions.created_at', 'desc').limit(10).leftJoin('materials', 'inventory_transactions.material_id', 'materials.id').select('inventory_transactions.*', 'materials.name as material_name'),
      db('materials').where({ org_id: orgId }).groupBy('category').select('category').count('id as count').sum('total_value as value'),
      db('quality_inspections').where({ org_id: orgId }).groupBy('result').select('result').count('id as count'),
    ]);

    // C-Note & SIV KPIs (safe — tables may not exist yet during migration)
    let totalCNotes = 0, pendingCNotes = 0, totalSIVs = 0, pendingSIVs = 0;
    try {
      const cnoteExists = await db.schema.hasTable('consignment_notes');
      if (cnoteExists) {
        const cn1 = await db('consignment_notes').where({ org_id: orgId }).count('id as c').first();
        const cn2 = await db('consignment_notes').where({ org_id: orgId }).whereIn('status', ['draft', 'in_transit']).count('id as c').first();
        totalCNotes = +cn1.c;
        pendingCNotes = +cn2.c;
      }
      const sivExists = await db.schema.hasTable('store_issue_vouchers');
      if (sivExists) {
        const sv1 = await db('store_issue_vouchers').where({ org_id: orgId }).count('id as c').first();
        const sv2 = await db('store_issue_vouchers').where({ org_id: orgId, status: 'pending' }).count('id as c').first();
        totalSIVs = +sv1.c;
        pendingSIVs = +sv2.c;
      }
    } catch (_) { /* tables not migrated yet */ }

    // Monthly trend — SQLite compatible
    let monthlyTrend = [];
    try {
      if (isSQLite()) {
        monthlyTrend = await db('inventory_transactions')
          .where({ org_id: orgId })
          .whereRaw("created_at >= datetime('now', '-6 months')")
          .groupByRaw("strftime('%Y-%m', created_at), type")
          .select(db.raw("strftime('%Y-%m', created_at) as month, type, COUNT(*) as count, SUM(quantity) as quantity"));
      } else {
        monthlyTrend = await db('inventory_transactions')
          .where({ org_id: orgId })
          .whereRaw("created_at > NOW() - INTERVAL '6 months'")
          .groupByRaw("DATE_TRUNC('month', created_at), type")
          .select(db.raw("DATE_TRUNC('month', created_at) as month, type, COUNT(*) as count, SUM(quantity) as quantity"));
      }
    } catch (e) { monthlyTrend = []; }

    res.json({
      kpis: {
        totalMaterials: +totalMaterials.c,
        inventoryValue: +(inventoryValue.v || 0),
        lowStockCount: +lowStockCount.c,
        pendingInspections: +pendingInspections.c,
        totalVendors: +totalVendors.c,
        totalWarehouses: +totalWarehouses.c,
        activePOs: +activePOs.c,
        totalCNotes,
        pendingCNotes,
        totalSIVs,
        pendingSIVs,
      },
      recentMaterials,
      recentTransactions,
      categoryBreakdown,
      monthlyTrend,
      qualityStats,
    });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch dashboard data' }); }
};

// ─── Users (Admin) ─────────────────────────────────────────────────────────────
exports.getUsers = async (req, res) => {
  try {
    const users = await db('users').where({ org_id: req.user.org_id }).select('id', 'name', 'email', 'role', 'department', 'phone', 'is_active', 'created_at');
    res.json(users);
  } catch (e) { res.status(500).json({ error: 'Failed to fetch users' }); }
};

exports.createUser = async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(req.body.password || 'Welcome@123', 12);
    const user = await insertAndFetch('users', { ...req.body, id: uuidv4(), org_id: req.user.org_id, password_hash: hash });
    const { password_hash, ...safe } = user;
    res.status(201).json(safe);
  } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to create user' }); }
};

exports.updateUser = async (req, res) => {
  try {
    const u = await updateAndFetch('users', { id: req.params.id, org_id: req.user.org_id }, { ...req.body, updated_at: new Date().toISOString() });
    if (!u) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safe } = u;
    res.json(safe);
  } catch (e) { res.status(500).json({ error: 'Failed to update user' }); }
};

// ─── Workflows ─────────────────────────────────────────────────────────────────
exports.getWorkflows = async (req, res) => {
  try {
    const wf = await db('workflows').where({ org_id: req.user.org_id }).orderBy('name');
    res.json(wf.map(w => parseJsonFields(w, ['stages'])));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch workflows' }); }
};

exports.createWorkflow = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.stages && typeof body.stages !== 'string') body.stages = JSON.stringify(body.stages);
    const wf = await insertAndFetch('workflows', { ...body, id: uuidv4(), org_id: req.user.org_id });
    res.status(201).json(parseJsonFields(wf, ['stages']));
  } catch (e) { res.status(500).json({ error: 'Failed to create workflow' }); }
};

exports.updateWorkflow = async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.stages && typeof body.stages !== 'string') body.stages = JSON.stringify(body.stages);
    const wf = await updateAndFetch('workflows', { id: req.params.id, org_id: req.user.org_id }, { ...body, updated_at: new Date().toISOString() });
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    res.json(parseJsonFields(wf, ['stages']));
  } catch (e) { res.status(500).json({ error: 'Failed to update workflow' }); }
};

// ─── Organization ──────────────────────────────────────────────────────────────
exports.getOrg = async (req, res) => {
  try {
    const org = await db('organizations').where({ id: req.user.org_id }).first();
    res.json(parseJsonFields(org, ['settings']));
  } catch (e) { res.status(500).json({ error: 'Failed to fetch organization' }); }
};

exports.updateOrg = async (req, res) => {
  try {
    const org = await updateAndFetch('organizations', { id: req.user.org_id }, { ...req.body, updated_at: new Date().toISOString() });
    res.json(parseJsonFields(org, ['settings']));
  } catch (e) { res.status(500).json({ error: 'Failed to update organization' }); }
};
