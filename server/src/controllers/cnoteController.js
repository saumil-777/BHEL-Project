const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

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

const paginate = (q, page, limit) => q.limit(+limit).offset((+page - 1) * +limit);

// ─── Get All C-Notes ──────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, vendor_id, status, from_date, to_date } = req.query;
    let q = db('consignment_notes').where({ 'consignment_notes.org_id': req.user.org_id });

    if (search) {
      q = q.where(function () {
        this.where('cnote_number', 'like', `%${search}%`)
          .orWhere('vendor_name', 'like', `%${search}%`)
          .orWhere('material_name', 'like', `%${search}%`)
          .orWhere('transporter_name', 'like', `%${search}%`)
          .orWhere('vehicle_number', 'like', `%${search}%`)
          .orWhere('invoice_number', 'like', `%${search}%`);
      });
    }
    if (vendor_id) q = q.where({ 'consignment_notes.vendor_id': vendor_id });
    if (status) q = q.where({ 'consignment_notes.status': status });
    if (from_date) q = q.where('consignment_notes.dispatch_date', '>=', from_date);
    if (to_date) q = q.where('consignment_notes.dispatch_date', '<=', to_date);

    const total = await q.clone().count('consignment_notes.id as c').first();
    const data = await paginate(
      q.leftJoin('users', 'consignment_notes.created_by', 'users.id')
        .select('consignment_notes.*', 'users.name as created_by_name')
        .orderBy('consignment_notes.created_at', 'desc'),
      page, limit
    );

    res.json({ data, total: +total.c });
  } catch (e) {
    console.error('C-Note getAll error:', e);
    res.status(500).json({ error: 'Failed to fetch C-Notes' });
  }
};

// ─── Get One C-Note ───────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const cnote = await db('consignment_notes')
      .where({ 'consignment_notes.id': req.params.id, 'consignment_notes.org_id': req.user.org_id })
      .leftJoin('users', 'consignment_notes.created_by', 'users.id')
      .select('consignment_notes.*', 'users.name as created_by_name')
      .first();

    if (!cnote) return res.status(404).json({ error: 'C-Note not found' });

    // Get linked material details
    let material = null;
    if (cnote.material_id) {
      material = await db('materials').where({ id: cnote.material_id }).first();
    }

    // Get audit history
    const history = await db('audit_logs')
      .where({ entity_type: 'cnote', entity_id: cnote.id })
      .orderBy('timestamp', 'desc')
      .limit(20);

    res.json({ ...cnote, material, history });
  } catch (e) {
    console.error('C-Note getOne error:', e);
    res.status(500).json({ error: 'Failed to fetch C-Note' });
  }
};

// ─── Create C-Note ────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const count = await db('consignment_notes').where({ org_id: orgId }).count('id as c').first();
    const cnoteNumber = `CN-${new Date().getFullYear()}-${String(+count.c + 1).padStart(4, '0')}`;

    // Denormalize vendor name if vendor_id provided
    let vendorName = req.body.vendor_name || '';
    let vendorCode = req.body.vendor_code || '';
    if (req.body.vendor_id && !vendorName) {
      const vendor = await db('vendors').where({ id: req.body.vendor_id }).first();
      if (vendor) {
        vendorName = vendor.name;
      }
    }

    // Denormalize material name if material_id provided
    let materialName = req.body.material_name || '';
    let unit = req.body.unit || 'pcs';
    if (req.body.material_id && !materialName) {
      const material = await db('materials').where({ id: req.body.material_id }).first();
      if (material) {
        materialName = material.name;
        unit = material.unit || unit;
      }
    }

    const cnote = await insertAndFetch('consignment_notes', {
      id: uuidv4(),
      org_id: orgId,
      cnote_number: cnoteNumber,
      vendor_id: req.body.vendor_id || null,
      vendor_name: vendorName,
      vendor_code: vendorCode,
      material_id: req.body.material_id || null,
      material_name: materialName,
      quantity: req.body.quantity || 0,
      unit,
      transporter_name: req.body.transporter_name || '',
      vehicle_number: req.body.vehicle_number || '',
      dispatch_date: req.body.dispatch_date || null,
      arrival_date: req.body.arrival_date || null,
      po_number: req.body.po_number || '',
      invoice_number: req.body.invoice_number || '',
      status: req.body.status || 'draft',
      remarks: req.body.remarks || '',
      created_by: req.user.id,
    });

    // Emit socket event
    if (req.io) req.io.to(`org-${orgId}`).emit('cnote-created', cnote);

    res.status(201).json(cnote);
  } catch (e) {
    console.error('C-Note create error:', e);
    res.status(500).json({ error: 'Failed to create C-Note' });
  }
};

// ─── Update C-Note ────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const existing = await db('consignment_notes')
      .where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'C-Note not found' });

    req._prevValue = existing;

    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    // Re-denormalize if vendor_id changed
    if (req.body.vendor_id && req.body.vendor_id !== existing.vendor_id) {
      const vendor = await db('vendors').where({ id: req.body.vendor_id }).first();
      if (vendor) updateData.vendor_name = vendor.name;
    }
    if (req.body.material_id && req.body.material_id !== existing.material_id) {
      const material = await db('materials').where({ id: req.body.material_id }).first();
      if (material) {
        updateData.material_name = material.name;
        updateData.unit = material.unit || updateData.unit;
      }
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.org_id;
    delete updateData.cnote_number;
    delete updateData.created_by;
    delete updateData.created_at;

    const cnote = await updateAndFetch('consignment_notes', { id: req.params.id }, updateData);
    res.json(cnote);
  } catch (e) {
    console.error('C-Note update error:', e);
    res.status(500).json({ error: 'Failed to update C-Note' });
  }
};

// ─── Delete C-Note ────────────────────────────────────────────────────────────
exports.deleteCNote = async (req, res) => {
  try {
    const existing = await db('consignment_notes')
      .where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'C-Note not found' });

    req._prevValue = existing;
    await db('consignment_notes').where({ id: req.params.id }).delete();
    res.json({ message: 'C-Note deleted successfully' });
  } catch (e) {
    console.error('C-Note delete error:', e);
    res.status(500).json({ error: 'Failed to delete C-Note' });
  }
};
