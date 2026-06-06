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

function calculateMaterialForecast(material, sivsForMaterial) {
  const currentQty = +material.quantity;
  const minStock = +material.min_stock_level || 0;
  const reorderLevel = +material.reorder_level || 0;
  
  if (!sivsForMaterial || sivsForMaterial.length === 0) {
    return {
      material_id: material.id,
      name: material.name,
      material_code: material.material_id,
      category: material.category,
      unit: material.unit,
      current_quantity: currentQty,
      min_stock_level: minStock,
      reorder_level: reorderLevel,
      has_history: false,
      recommended_reorder_qty: Math.max(0, (reorderLevel * 2) - currentQty),
      forecasts: null
    };
  }

  // Calculate Average Daily Rate (ADR)
  const totalIssued = sivsForMaterial.reduce((acc, s) => acc + (+s.quantity_issued || 0), 0);
  
  const oldestSivDate = new Date(Math.min(...sivsForMaterial.map(s => new Date(s.date_issued))));
  const today = new Date();
  const timeDiff = Math.abs(today - oldestSivDate);
  const diffDays = Math.max(1, Math.ceil(timeDiff / (1000 * 60 * 60 * 24)));
  
  const dailyRateADR = totalIssued / diffDays;

  // Group weekly usage for 12 weeks
  const weeklyUsage = Array(12).fill(0);
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  
  sivsForMaterial.forEach(s => {
    const sDate = new Date(s.date_issued);
    const ageWeeks = Math.floor((today - sDate) / oneWeekMs);
    if (ageWeeks >= 0 && ageWeeks < 12) {
      weeklyUsage[11 - ageWeeks] += (+s.quantity_issued || 0);
    }
  });

  // 1. ADR Calculations
  let adrDays = null;
  let adrStockOutDate = null;
  let adrReorderDays = null;
  let adrReorderDate = null;

  if (dailyRateADR > 0) {
    adrDays = currentQty / dailyRateADR;
    adrStockOutDate = new Date();
    adrStockOutDate.setDate(adrStockOutDate.getDate() + adrDays);
    adrStockOutDate = adrStockOutDate.toISOString().split('T')[0];

    adrReorderDays = Math.max(0, (currentQty - reorderLevel) / dailyRateADR);
    adrReorderDate = new Date();
    adrReorderDate.setDate(adrReorderDate.getDate() + adrReorderDays);
    adrReorderDate = adrReorderDate.toISOString().split('T')[0];
  }

  // 2. Exponential Moving Average (EMA)
  const alpha = 0.3;
  let emaWeekly = weeklyUsage[0];
  for (let i = 1; i < 12; i++) {
    emaWeekly = alpha * weeklyUsage[i] + (1 - alpha) * emaWeekly;
  }
  const dailyRateEMA = emaWeekly / 7;

  let emaDays = null;
  let emaStockOutDate = null;
  let emaReorderDays = null;
  let emaReorderDate = null;

  if (dailyRateEMA > 0) {
    emaDays = currentQty / dailyRateEMA;
    emaStockOutDate = new Date();
    emaStockOutDate.setDate(emaStockOutDate.getDate() + emaDays);
    emaStockOutDate = emaStockOutDate.toISOString().split('T')[0];

    emaReorderDays = Math.max(0, (currentQty - reorderLevel) / dailyRateEMA);
    emaReorderDate = new Date();
    emaReorderDate.setDate(emaReorderDate.getDate() + emaReorderDays);
    emaReorderDate = emaReorderDate.toISOString().split('T')[0];
  }

  // 3. Linear Regression
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  const N = 12;
  for (let i = 0; i < N; i++) {
    const x = i + 1;
    const y = weeklyUsage[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const slope = (N * sumXY - sumX * sumY) / (N * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / N;

  const regWeeklyForecast = Math.max(0, slope * 13 + intercept);
  const dailyRateReg = regWeeklyForecast / 7;

  let regDays = null;
  let regStockOutDate = null;
  let regReorderDays = null;
  let regReorderDate = null;

  if (dailyRateReg > 0) {
    regDays = currentQty / dailyRateReg;
    regStockOutDate = new Date();
    regStockOutDate.setDate(regStockOutDate.getDate() + regDays);
    regStockOutDate = regStockOutDate.toISOString().split('T')[0];

    regReorderDays = Math.max(0, (currentQty - reorderLevel) / dailyRateReg);
    regReorderDate = new Date();
    regReorderDate.setDate(regReorderDate.getDate() + regReorderDays);
    regReorderDate = regReorderDate.toISOString().split('T')[0];
  }

  // Fallbacks if EMA/Regression calculations result in zero rate
  let primaryRate = dailyRateADR;
  let primaryDays = adrDays;
  let primaryStockOutDate = adrStockOutDate;
  let primaryReorderDate = adrReorderDate;

  let status = 'stable';
  if (primaryDays !== null) {
    if (primaryDays <= 7) status = 'critical';
    else if (primaryDays <= 30) status = 'warning';
  }

  const bufferDays = 45;
  const recommendedQty = Math.max(0, Math.ceil(primaryRate * bufferDays - currentQty));

  return {
    material_id: material.id,
    name: material.name,
    material_code: material.material_id,
    category: material.category,
    unit: material.unit,
    current_quantity: currentQty,
    min_stock_level: minStock,
    reorder_level: reorderLevel,
    has_history: true,
    status,
    recommended_reorder_qty: recommendedQty,
    primary_forecast: {
      daily_rate: +primaryRate.toFixed(2),
      days_remaining: primaryDays !== null ? +primaryDays.toFixed(0) : null,
      stockout_date: primaryStockOutDate,
      reorder_date: primaryReorderDate
    },
    weekly_history: weeklyUsage,
    models: {
      adr: {
        name: 'Average Daily Rate',
        daily_rate: +dailyRateADR.toFixed(2),
        days_remaining: adrDays !== null ? +adrDays.toFixed(0) : null,
        stockout_date: adrStockOutDate,
        reorder_date: adrReorderDate
      },
      ema: {
        name: 'Exponential Moving Average (EMA)',
        daily_rate: +dailyRateEMA.toFixed(2),
        days_remaining: emaDays !== null ? +emaDays.toFixed(0) : null,
        stockout_date: emaStockOutDate,
        reorder_date: emaReorderDate
      },
      regression: {
        name: 'Linear Regression (Trend)',
        daily_rate: +dailyRateReg.toFixed(2),
        days_remaining: regDays !== null ? +regDays.toFixed(0) : null,
        stockout_date: regStockOutDate,
        reorder_date: regReorderDate,
        slope: +slope.toFixed(2),
        intercept: +intercept.toFixed(2)
      }
    }
  };
}

exports.getForecast = async (req, res) => {
  try {
    const { id, days = 90 } = req.query;
    const orgId = req.user.org_id;

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - parseInt(days));
    const fromDateStr = fromDate.toISOString().split('T')[0];

    if (id) {
      const material = await db('materials').where({ id, org_id: orgId }).first();
      if (!material) return res.status(404).json({ error: 'Material not found' });

      const sivs = await db('store_issue_vouchers')
        .where({ org_id: orgId, material_id: id, status: 'issued' })
        .where('date_issued', '>=', fromDateStr)
        .orderBy('date_issued', 'asc');

      const forecast = calculateMaterialForecast(material, sivs);
      return res.json(forecast);
    } else {
      const materials = await db('materials').where({ org_id: orgId });
      const sivs = await db('store_issue_vouchers')
        .where({ org_id: orgId, status: 'issued' })
        .where('date_issued', '>=', fromDateStr);

      const forecasts = materials.map(m => {
        const materialSivs = sivs.filter(s => s.material_id === m.id);
        return calculateMaterialForecast(m, materialSivs);
      });

      return res.json(forecasts);
    }
  } catch (err) {
    console.error('getForecast error:', err);
    res.status(500).json({ error: 'Failed to generate demand forecasts' });
  }
};
