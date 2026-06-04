const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const paginate = (query, page = 1, limit = 20) => query.limit(+limit).offset((+page - 1) * +limit);

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, category, status, vendor_id } = req.query;
    let query = db('materials')
      .where({ 'materials.org_id': req.user.org_id })
      .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
      .leftJoin('locations', 'materials.location_id', 'locations.id')
      .leftJoin('warehouses', 'locations.warehouse_id', 'warehouses.id')
      .select('materials.*', 'vendors.name as vendor_name', 'locations.zone', 'locations.rack', 'locations.shelf', 'warehouses.name as warehouse_name');

    if (search) {
      query = query.where((b) =>
        b.where('materials.name', 'like', `%${search}%`)
          .orWhere('materials.material_id', 'like', `%${search}%`)
          .orWhere('materials.sku', 'like', `%${search}%`)
          .orWhere('materials.category', 'like', `%${search}%`)
      );
    }
    if (category) query = query.where('materials.category', category);
    if (status) query = query.where('materials.status', status);
    if (vendor_id) query = query.where('materials.vendor_id', vendor_id);

    const total = await query.clone().clearSelect().count('materials.id as count').first();
    const data = await paginate(query.orderBy('materials.created_at', 'desc'), +page, +limit);

    res.json({ data, total: +total.count, page: +page, limit: +limit });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch materials' });
  }
};

exports.getOne = async (req, res) => {
  try {
    const material = await db('materials')
      .where({ 'materials.id': req.params.id, 'materials.org_id': req.user.org_id })
      .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
      .leftJoin('locations', 'materials.location_id', 'locations.id')
      .leftJoin('warehouses', 'locations.warehouse_id', 'warehouses.id')
      .leftJoin('users', 'materials.created_by', 'users.id')
      .select('materials.*', 'vendors.name as vendor_name', 'locations.zone', 'locations.rack', 'locations.shelf', 'warehouses.name as warehouse_name', 'users.name as created_by_name')
      .first();
    if (!material) return res.status(404).json({ error: 'Material not found' });

    const history = await db('material_status_history')
      .where({ material_id: material.id })
      .leftJoin('users', 'material_status_history.changed_by', 'users.id')
      .select('material_status_history.*', 'users.name as changed_by_name')
      .orderBy('changed_at', 'asc');

    const files = await db('files').where({ entity_type: 'material', entity_id: material.id });
    const inspections = await db('quality_inspections').where({ material_id: material.id }).orderBy('created_at', 'desc').limit(5);
    const transactions = await db('inventory_transactions').where({ material_id: material.id }).orderBy('created_at', 'desc').limit(10);

    res.json({ ...material, history, files, inspections, transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch material' });
  }
};

exports.create = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const count = await db('materials').where({ org_id: orgId }).count('id as c').first();
    const materialId = `MAT-${String(+count.c + 1).padStart(4, '0')}`;
    const id = uuidv4();

    const data = {
      ...req.body,
      id,
      org_id: orgId,
      material_id: materialId,
      total_value: (req.body.quantity || 0) * (req.body.cost || 0),
      created_by: req.user.id,
    };
    await db('materials').insert(data);
    const created = await db('materials').where({ id }).first();

    // Status history
    await db('material_status_history').insert({
      id: uuidv4(),
      material_id: id,
      to_status: created.status || 'received',
      notes: 'Material registered',
      changed_by: req.user.id,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create material' });
  }
};

exports.update = async (req, res) => {
  try {
    const existing = await db('materials').where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'Material not found' });

    req._prevValue = existing;
    const updateData = {
      ...req.body,
      total_value: (req.body.quantity || existing.quantity) * (req.body.cost || existing.cost),
      updated_at: new Date().toISOString(),
    };
    await db('materials').where({ id: req.params.id }).update(updateData);
    const updated = await db('materials').where({ id: req.params.id }).first();

    // Status change history
    if (req.body.status && req.body.status !== existing.status) {
      await db('material_status_history').insert({
        id: uuidv4(),
        material_id: updated.id,
        from_status: existing.status,
        to_status: updated.status,
        notes: req.body.status_notes || '',
        changed_by: req.user.id,
      });
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update material' });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const existing = await db('materials').where({ id: req.params.id, org_id: req.user.org_id }).first();
    if (!existing) return res.status(404).json({ error: 'Material not found' });
    req._prevValue = existing;
    await db('materials').where({ id: req.params.id }).delete();
    res.json({ message: 'Material deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete material' });
  }
};

exports.bulkImport = async (req, res) => {
  try {
    const rows = req.body.materials;
    const orgId = req.user.org_id;
    const count = await db('materials').where({ org_id: orgId }).count('id as c').first();
    let counter = +count.c;

    const prepared = rows.map((r) => {
      counter++;
      return { ...r, id: uuidv4(), org_id: orgId, material_id: r.material_id || `MAT-${String(counter).padStart(4, '0')}`, total_value: (r.quantity || 0) * (r.cost || 0), created_by: req.user.id };
    });

    await db('materials').insert(prepared);
    res.json({ imported: prepared.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bulk import failed' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const cats = await db('materials').where({ org_id: req.user.org_id }).distinct('category').whereNotNull('category').pluck('category');
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const items = await db('materials').where({ org_id: req.user.org_id }).whereRaw('quantity <= min_stock_level AND min_stock_level > 0').select('*');
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
};
