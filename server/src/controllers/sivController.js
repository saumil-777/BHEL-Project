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

// ─── Get All SIVs ─────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, department, status, from_date, to_date } = req.query;
    let q = db('store_issue_vouchers').where({ 'store_issue_vouchers.org_id': req.user.org_id });

    if (search) {
      q = q.where(function () {
        this.where('siv_number', 'like', `%${search}%`)
          .orWhere('material_name', 'like', `%${search}%`)
          .orWhere('department', 'like', `%${search}%`)
          .orWhere('requested_by', 'like', `%${search}%`);
      });
    }
    if (department) q = q.where({ 'store_issue_vouchers.department': department });
    if (status) q = q.where({ 'store_issue_vouchers.status': status });
    if (from_date) q = q.where('store_issue_vouchers.date_issued', '>=', from_date);
    if (to_date) q = q.where('store_issue_vouchers.date_issued', '<=', to_date);

    const total = await q.clone().count('store_issue_vouchers.id as c').first();
    const data = await paginate(
      q.leftJoin('users as creator', 'store_issue_vouchers.created_by', 'creator.id')
        .select('store_issue_vouchers.*', 'creator.name as created_by_name')
        .orderBy('store_issue_vouchers.created_at', 'desc'),
      page, limit
    );

    res.json({ data, total: +total.c });
  } catch (e) {
    console.error('SIV getAll error:', e);
    res.status(500).json({ error: 'Failed to fetch SIVs' });
  }
};

// ─── Get One SIV ──────────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const siv = await db('store_issue_vouchers')
      .where({ 'store_issue_vouchers.id': req.params.id, 'store_issue_vouchers.org_id': req.user.org_id })
      .leftJoin('users as creator', 'store_issue_vouchers.created_by', 'creator.id')
      .select('store_issue_vouchers.*', 'creator.name as created_by_name')
      .first();

    if (!siv) return res.status(404).json({ error: 'SIV not found' });

    let material = null;
    if (siv.material_id) {
      material = await db('materials').where({ id: siv.material_id }).first();
    }

    const history = await db('audit_logs')
      .where({ entity_type: 'siv', entity_id: siv.id })
      .orderBy('timestamp', 'desc')
      .limit(20);

    res.json({ ...siv, material, history });
  } catch (e) {
    console.error('SIV getOne error:', e);
    res.status(500).json({ error: 'Failed to fetch SIV' });
  }
};

// ─── Create SIV ───────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const count = await db('store_issue_vouchers').where({ org_id: orgId }).count('id as c').first();
    const sivNumber = `SIV-${new Date().getFullYear()}-${String(+count.c + 1).padStart(4, '0')}`;

    // Denormalize material name
    let materialName = req.body.material_name || '';
    if (req.body.material_id && !materialName) {
      const material = await db('materials').where({ id: req.body.material_id }).first();
      if (material) materialName = material.name;
    }

    const siv = await insertAndFetch('store_issue_vouchers', {
      id: uuidv4(),
      org_id: orgId,
      siv_number: sivNumber,
      material_id: req.body.material_id || null,
      material_name: materialName,
      department: req.body.department || '',
      requested_by: req.body.requested_by || '',
      approved_by: null,
      approved_by_name: null,
      quantity_issued: req.body.quantity_issued || 0,
      date_issued: null,
      remarks: req.body.remarks || '',
      status: 'pending',
      created_by: req.user.id,
    });

    if (req.io) req.io.to(`org-${orgId}`).emit('siv-created', siv);

    res.status(201).json(siv);
  } catch (e) {
    console.error('SIV create error:', e);
    res.status(500).json({ error: 'Failed to create SIV' });
  }
};

// ─── Update SIV ───────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const existing = await db('store_issue_vouchers')
      .where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'SIV not found' });

    req._prevValue = existing;

    const updateData = { ...req.body, updated_at: new Date().toISOString() };
    if (req.body.material_id && req.body.material_id !== existing.material_id) {
      const material = await db('materials').where({ id: req.body.material_id }).first();
      if (material) updateData.material_name = material.name;
    }

    delete updateData.id;
    delete updateData.org_id;
    delete updateData.siv_number;
    delete updateData.created_by;
    delete updateData.created_at;

    const siv = await updateAndFetch('store_issue_vouchers', { id: req.params.id }, updateData);
    res.json(siv);
  } catch (e) {
    console.error('SIV update error:', e);
    res.status(500).json({ error: 'Failed to update SIV' });
  }
};

// ─── Approve SIV ──────────────────────────────────────────────────────────────
exports.approve = async (req, res) => {
  try {
    const existing = await db('store_issue_vouchers')
      .where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'SIV not found' });
    if (existing.status !== 'pending') {
      return res.status(400).json({ error: `Cannot approve SIV with status "${existing.status}"` });
    }

    req._prevValue = existing;

    const siv = await updateAndFetch('store_issue_vouchers', { id: req.params.id }, {
      status: 'approved',
      approved_by: req.user.id,
      approved_by_name: req.user.name,
      updated_at: new Date().toISOString(),
    });

    // Notify SIV creator
    await db('notifications').insert({
      id: uuidv4(),
      org_id: req.user.org_id,
      user_id: existing.created_by,
      type: 'siv_approved',
      title: 'SIV Approved',
      body: `${existing.siv_number} has been approved by ${req.user.name}`,
      entity_type: 'siv',
      entity_id: existing.id,
      is_read: false,
    });

    if (req.io) req.io.to(`org-${req.user.org_id}`).emit('siv-approved', siv);

    res.json(siv);
  } catch (e) {
    console.error('SIV approve error:', e);
    res.status(500).json({ error: 'Failed to approve SIV' });
  }
};

// ─── Issue SIV (deducts inventory) ────────────────────────────────────────────
exports.issue = async (req, res) => {
  try {
    const existing = await db('store_issue_vouchers')
      .where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'SIV not found' });
    if (existing.status !== 'approved') {
      return res.status(400).json({ error: `SIV must be approved before issuing. Current status: "${existing.status}"` });
    }

    // Check material stock
    const material = await db('materials').where({ id: existing.material_id }).first();
    if (!material) return res.status(404).json({ error: 'Linked material not found' });
    if (+material.quantity < +existing.quantity_issued) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${material.quantity} ${material.unit}, Requested: ${existing.quantity_issued}` });
    }

    req._prevValue = existing;

    // Deduct inventory
    const newQty = +material.quantity - +existing.quantity_issued;
    await db('materials').where({ id: existing.material_id }).update({
      quantity: newQty,
      total_value: newQty * +material.cost,
    });

    // Create inventory transaction
    await db('inventory_transactions').insert({
      id: uuidv4(),
      org_id: req.user.org_id,
      material_id: existing.material_id,
      type: 'stock_out',
      quantity: existing.quantity_issued,
      reference_number: existing.siv_number,
      notes: `SIV Issue to ${existing.department} — Requested by ${existing.requested_by}`,
      created_by: req.user.id,
    });

    // Update SIV
    const siv = await updateAndFetch('store_issue_vouchers', { id: req.params.id }, {
      status: 'issued',
      date_issued: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    });

    // Low stock notification
    if (newQty <= +material.min_stock_level && +material.min_stock_level > 0) {
      await db('notifications').insert({
        id: uuidv4(),
        org_id: req.user.org_id,
        user_id: req.user.id,
        type: 'low_stock',
        title: 'Low Stock Alert',
        body: `${material.name} stock is critically low after SIV issue (${newQty} ${material.unit})`,
        entity_type: 'material',
        entity_id: material.id,
        is_read: false,
      });
    }

    if (req.io) req.io.to(`org-${req.user.org_id}`).emit('siv-issued', siv);

    res.json(siv);
  } catch (e) {
    console.error('SIV issue error:', e);
    res.status(500).json({ error: 'Failed to issue SIV' });
  }
};

// ─── Delete SIV ───────────────────────────────────────────────────────────────
exports.deleteSIV = async (req, res) => {
  try {
    const existing = await db('store_issue_vouchers')
      .where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'SIV not found' });
    if (existing.status === 'issued') {
      return res.status(400).json({ error: 'Cannot delete an issued SIV' });
    }

    req._prevValue = existing;
    await db('store_issue_vouchers').where({ id: req.params.id }).delete();
    res.json({ message: 'SIV deleted successfully' });
  } catch (e) {
    console.error('SIV delete error:', e);
    res.status(500).json({ error: 'Failed to delete SIV' });
  }
};
