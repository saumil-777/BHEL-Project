const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const db = require('../config/database');

const BRAND_COLOR = '#6366f1';
const DARK = '#1e1e2e';

function addPDFHeader(doc, title, orgName) {
  doc.rect(0, 0, doc.page.width, 80).fill(DARK);
  doc.fillColor(BRAND_COLOR).fontSize(22).text('SMIMP', 40, 22, { continued: true });
  doc.fillColor('white').fontSize(14).text(`  |  ${title}`, { continued: false });
  doc.fillColor('#aaa').fontSize(10).text(orgName || 'Organization', 40, 55);
  doc.fillColor('#888').text(`Generated: ${new Date().toLocaleString('en-IN')}`, 40, 67);
  doc.moveDown(2);
  doc.fillColor(DARK);
}

function tableRow(doc, row, cols, y, isHeader = false) {
  const colWidths = cols.map((c) => c.width || 100);
  let x = 40;
  if (isHeader) {
    doc.rect(40, y - 4, colWidths.reduce((a, b) => a + b, 0), 20).fill('#f0f0f8');
    doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold');
  } else {
    doc.fillColor('#333').fontSize(9).font('Helvetica');
  }
  cols.forEach((col, i) => {
    doc.text(String(row[col.key] ?? ''), x + 4, y, { width: colWidths[i] - 8, lineBreak: false });
    x += colWidths[i];
  });
}

// ─── Materials Report ──────────────────────────────────────────────────────────
exports.materialsReport = async (req, res) => {
  try {
    const { format = 'pdf', status, category } = req.query;
    let q = db('materials').where({ 'materials.org_id': req.user.org_id })
      .leftJoin('vendors', 'materials.vendor_id', 'vendors.id')
      .select('materials.material_id', 'materials.name', 'materials.category', 'materials.sku', 'vendors.name as vendor', 'materials.quantity', 'materials.unit', 'materials.cost', 'materials.total_value', 'materials.status');
    if (status) q = q.where({ 'materials.status': status });
    if (category) q = q.where({ 'materials.category': category });
    const materials = await q.orderBy('materials.name');
    const org = await db('organizations').where({ id: req.user.org_id }).first();

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'SMIMP';
      const ws = wb.addWorksheet('Materials');
      ws.columns = [
        { header: 'Material ID', key: 'material_id', width: 15 },
        { header: 'Name', key: 'name', width: 30 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Vendor', key: 'vendor', width: 25 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Unit', key: 'unit', width: 8 },
        { header: 'Cost (₹)', key: 'cost', width: 15 },
        { header: 'Total Value (₹)', key: 'total_value', width: 18 },
        { header: 'Status', key: 'status', width: 15 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      materials.forEach((m) => ws.addRow(m));
      // Totals row
      const totalRow = ws.addRow({ name: 'TOTAL', total_value: materials.reduce((a, m) => a + +(m.total_value || 0), 0) });
      totalRow.font = { bold: true };

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=materials_${Date.now()}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'csv') {
      const headers = ['Material ID', 'Name', 'Category', 'SKU', 'Vendor', 'Quantity', 'Unit', 'Cost', 'Total Value', 'Status'];
      const rows = materials.map((m) => [m.material_id, m.name, m.category, m.sku, m.vendor, m.quantity, m.unit, m.cost, m.total_value, m.status]);
      const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=materials_${Date.now()}.csv`);
      return res.send(csv);
    }

    // PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=materials_${Date.now()}.pdf`);
    doc.pipe(res);

    addPDFHeader(doc, 'Materials Report', org?.name);

    const cols = [
      { key: 'material_id', label: 'Mat ID', width: 70 },
      { key: 'name', label: 'Name', width: 150 },
      { key: 'category', label: 'Category', width: 90 },
      { key: 'vendor', label: 'Vendor', width: 110 },
      { key: 'quantity', label: 'Qty', width: 50 },
      { key: 'unit', label: 'Unit', width: 45 },
      { key: 'total_value', label: 'Value (₹)', width: 80 },
      { key: 'status', label: 'Status', width: 70 },
    ];

    let y = doc.y;
    tableRow(doc, Object.fromEntries(cols.map((c) => [c.key, c.label])), cols, y, true);
    y += 22;
    materials.forEach((m, i) => {
      if (y > 500) { doc.addPage(); y = 60; }
      if (i % 2 === 0) {
        doc.rect(40, y - 4, cols.reduce((a, c) => a + c.width, 0), 18).fill('#f9f9ff');
      }
      tableRow(doc, { ...m, total_value: `₹${Number(m.total_value || 0).toLocaleString('en-IN')}` }, cols, y);
      y += 18;
    });

    doc.moveDown(2).fillColor(BRAND_COLOR).fontSize(10).text(`Total Materials: ${materials.length}  |  Total Value: ₹${materials.reduce((a, m) => a + +(m.total_value || 0), 0).toLocaleString('en-IN')}`);
    doc.end();
  } catch (e) { console.error('Materials report error:', e); res.status(500).json({ error: 'Report generation failed' }); }
};

// ─── Inventory Report ─────────────────────────────────────────────────────────
exports.inventoryReport = async (req, res) => {
  try {
    const { format = 'pdf', type } = req.query;
    let q = db('inventory_transactions').where({ 'inventory_transactions.org_id': req.user.org_id })
      .leftJoin('materials', 'inventory_transactions.material_id', 'materials.id')
      .leftJoin('users', 'inventory_transactions.created_by', 'users.id')
      .select('inventory_transactions.*', 'materials.name as material_name', 'materials.material_id as mat_id', 'users.name as created_by_name')
      .orderBy('inventory_transactions.created_at', 'desc');
    if (type) q = q.where({ 'inventory_transactions.type': type });
    const transactions = await q.limit(500);
    const org = await db('organizations').where({ id: req.user.org_id }).first();

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Inventory Transactions');
      ws.columns = [
        { header: 'Date', key: 'created_at', width: 20 },
        { header: 'Material', key: 'material_name', width: 30 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Reference', key: 'reference_number', width: 20 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'By', key: 'created_by_name', width: 20 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      transactions.forEach((t) => ws.addRow({ ...t, created_at: t.created_at ? new Date(t.created_at).toLocaleString('en-IN') : 'N/A' }));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=inventory_${Date.now()}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'csv') {
      const headers = ['Date', 'Material', 'Mat ID', 'Type', 'Quantity', 'Reference', 'Notes', 'By'];
      const rows = transactions.map((t) => [t.created_at ? new Date(t.created_at).toLocaleString('en-IN') : 'N/A', t.material_name, t.mat_id, t.type, t.quantity, t.reference_number, t.notes, t.created_by_name]);
      const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=inventory_${Date.now()}.csv`);
      return res.send(csv);
    }

    // PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=inventory_${Date.now()}.pdf`);
    doc.pipe(res);
    addPDFHeader(doc, 'Inventory Transactions Report', org?.name);

    const cols = [
      { key: 'date', label: 'Date', width: 100 },
      { key: 'material_name', label: 'Material', width: 160 },
      { key: 'type', label: 'Type', width: 80 },
      { key: 'quantity', label: 'Qty', width: 60 },
      { key: 'reference_number', label: 'Ref #', width: 100 },
      { key: 'created_by_name', label: 'By', width: 100 },
    ];

    let y = doc.y;
    tableRow(doc, Object.fromEntries(cols.map((c) => [c.key, c.label])), cols, y, true);
    y += 22;
    transactions.forEach((t, i) => {
      if (y > 500) { doc.addPage(); y = 60; }
      if (i % 2 === 0) doc.rect(40, y - 4, 600, 18).fill('#f9f9ff');
      tableRow(doc, { ...t, date: t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : 'N/A' }, cols, y);
      y += 18;
    });
    doc.end();
  } catch (e) { console.error('Inventory report error:', e); res.status(500).json({ error: 'Report generation failed' }); }
};

// ─── Audit Report ─────────────────────────────────────────────────────────────
exports.auditReport = async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;
    const logs = await db('audit_logs').where({ org_id: req.user.org_id }).orderBy('timestamp', 'desc').limit(500);
    const org = await db('organizations').where({ id: req.user.org_id }).first();

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Audit Logs');
      ws.columns = [
        { header: 'Timestamp', key: 'timestamp', width: 22 },
        { header: 'User', key: 'user_name', width: 25 },
        { header: 'Email', key: 'user_email', width: 30 },
        { header: 'Action', key: 'action', width: 15 },
        { header: 'Entity', key: 'entity_type', width: 20 },
        { header: 'IP', key: 'ip_address', width: 15 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      logs.forEach((l) => ws.addRow({ ...l, timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : 'N/A' }));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=audit_${Date.now()}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'csv') {
      const headers = ['Timestamp', 'User', 'Email', 'Action', 'Entity Type', 'IP'];
      const rows = logs.map((l) => [l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : 'N/A', l.user_name, l.user_email, l.action, l.entity_type, l.ip_address]);
      const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=audit_${Date.now()}.csv`);
      return res.send(csv);
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=audit_${Date.now()}.pdf`);
    doc.pipe(res);
    addPDFHeader(doc, 'Audit Log Report', org?.name);
    const cols = [
      { key: 'timestamp', label: 'Timestamp', width: 120 },
      { key: 'user_name', label: 'User', width: 130 },
      { key: 'action', label: 'Action', width: 80 },
      { key: 'entity_type', label: 'Entity', width: 100 },
      { key: 'ip_address', label: 'IP', width: 100 },
    ];
    let y = doc.y;
    tableRow(doc, Object.fromEntries(cols.map((c) => [c.key, c.label])), cols, y, true);
    y += 22;
    logs.forEach((l, i) => {
      if (y > 500) { doc.addPage(); y = 60; }
      if (i % 2 === 0) doc.rect(40, y - 4, 530, 18).fill('#f9f9ff');
      tableRow(doc, { ...l, timestamp: l.timestamp ? new Date(l.timestamp).toLocaleString('en-IN') : 'N/A' }, cols, y);
      y += 18;
    });
    doc.end();
  } catch (e) { console.error('Audit report error:', e); res.status(500).json({ error: 'Audit report failed' }); }
};

// ─── Quality Report ────────────────────────────────────────────────────────────
exports.qualityReport = async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;
    const inspections = await db('quality_inspections')
      .where({ 'quality_inspections.org_id': req.user.org_id })
      .leftJoin('materials', 'quality_inspections.material_id', 'materials.id')
      .leftJoin('users', 'quality_inspections.inspector_id', 'users.id')
      .select('quality_inspections.*', 'materials.name as material_name', 'users.name as inspector_name')
      .orderBy('quality_inspections.created_at', 'desc');
    const org = await db('organizations').where({ id: req.user.org_id }).first();

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Quality Inspections');
      ws.columns = [
        { header: 'Inspection #', key: 'inspection_number', width: 18 },
        { header: 'Material', key: 'material_name', width: 30 },
        { header: 'Inspector', key: 'inspector_name', width: 22 },
        { header: 'Result', key: 'result', width: 12 },
        { header: 'Qty Inspected', key: 'quantity_inspected', width: 15 },
        { header: 'Qty Passed', key: 'quantity_passed', width: 12 },
        { header: 'Qty Failed', key: 'quantity_failed', width: 12 },
        { header: 'Notes', key: 'notes', width: 30 },
        { header: 'Date', key: 'inspected_at', width: 20 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      inspections.forEach((i) => ws.addRow({ ...i, inspected_at: i.inspected_at ? new Date(i.inspected_at).toLocaleDateString('en-IN') : 'N/A' }));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=quality_${Date.now()}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'csv') {
      const headers = ['Inspection #', 'Material', 'Inspector', 'Result', 'Qty Inspected', 'Qty Passed', 'Qty Failed', 'Notes'];
      const rows = inspections.map((i) => [i.inspection_number, i.material_name, i.inspector_name, i.result, i.quantity_inspected, i.quantity_passed, i.quantity_failed, i.notes]);
      const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=quality_${Date.now()}.csv`);
      return res.send(csv);
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quality_${Date.now()}.pdf`);
    doc.pipe(res);
    addPDFHeader(doc, 'Quality Inspection Report', org?.name);
    const cols = [
      { key: 'inspection_number', label: 'Insp #', width: 90 },
      { key: 'material_name', label: 'Material', width: 160 },
      { key: 'inspector_name', label: 'Inspector', width: 110 },
      { key: 'result', label: 'Result', width: 70 },
      { key: 'quantity_inspected', label: 'Qty', width: 50 },
      { key: 'quantity_passed', label: 'Pass', width: 50 },
      { key: 'quantity_failed', label: 'Fail', width: 50 },
    ];
    let y = doc.y;
    tableRow(doc, Object.fromEntries(cols.map((c) => [c.key, c.label])), cols, y, true);
    y += 22;
    inspections.forEach((insp, i) => {
      if (y > 500) { doc.addPage(); y = 60; }
      if (i % 2 === 0) doc.rect(40, y - 4, 580, 18).fill('#f9f9ff');
      tableRow(doc, insp, cols, y);
      y += 18;
    });
    doc.end();
  } catch (e) { console.error('Quality report error:', e); res.status(500).json({ error: 'Quality report failed' }); }
};

// ─── C-Note Report ─────────────────────────────────────────────────────────────
exports.cnoteReport = async (req, res) => {
  try {
    const { format = 'pdf', vendor_id, status, from_date, to_date } = req.query;
    let q = db('consignment_notes').where({ 'consignment_notes.org_id': req.user.org_id });
    if (vendor_id) q = q.where({ 'consignment_notes.vendor_id': vendor_id });
    if (status) q = q.where({ 'consignment_notes.status': status });
    if (from_date) q = q.where('consignment_notes.dispatch_date', '>=', from_date);
    if (to_date) q = q.where('consignment_notes.dispatch_date', '<=', to_date);
    const cnotes = await q.orderBy('consignment_notes.created_at', 'desc').limit(500);
    const org = await db('organizations').where({ id: req.user.org_id }).first();

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'SMIMP';
      const ws = wb.addWorksheet('C-Notes');
      ws.columns = [
        { header: 'C-Note #', key: 'cnote_number', width: 18 },
        { header: 'Vendor', key: 'vendor_name', width: 25 },
        { header: 'Material', key: 'material_name', width: 28 },
        { header: 'Quantity', key: 'quantity', width: 12 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Transporter', key: 'transporter_name', width: 22 },
        { header: 'Vehicle #', key: 'vehicle_number', width: 18 },
        { header: 'Dispatch', key: 'dispatch_date', width: 14 },
        { header: 'Arrival', key: 'arrival_date', width: 14 },
        { header: 'PO #', key: 'po_number', width: 16 },
        { header: 'Invoice #', key: 'invoice_number', width: 20 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Remarks', key: 'remarks', width: 30 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      cnotes.forEach((c) => ws.addRow(c));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=cnotes_${Date.now()}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'csv') {
      const headers = ['C-Note #', 'Vendor', 'Vendor Code', 'Material', 'Qty', 'Unit', 'Transporter', 'Vehicle #', 'Dispatch Date', 'Arrival Date', 'PO #', 'Invoice #', 'Status', 'Remarks'];
      const rows = cnotes.map((c) => [c.cnote_number, c.vendor_name, c.vendor_code, c.material_name, c.quantity, c.unit, c.transporter_name, c.vehicle_number, c.dispatch_date, c.arrival_date, c.po_number, c.invoice_number, c.status, c.remarks]);
      const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=cnotes_${Date.now()}.csv`);
      return res.send(csv);
    }

    // PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cnotes_${Date.now()}.pdf`);
    doc.pipe(res);
    addPDFHeader(doc, 'Consignment Notes (C-Notes) Report', org?.name);

    const cols = [
      { key: 'cnote_number', label: 'C-Note #', width: 85 },
      { key: 'vendor_name', label: 'Vendor', width: 110 },
      { key: 'material_name', label: 'Material', width: 120 },
      { key: 'quantity', label: 'Qty', width: 50 },
      { key: 'transporter_name', label: 'Transporter', width: 100 },
      { key: 'dispatch_date', label: 'Dispatch', width: 75 },
      { key: 'arrival_date', label: 'Arrival', width: 75 },
      { key: 'status', label: 'Status', width: 65 },
    ];

    let y = doc.y;
    tableRow(doc, Object.fromEntries(cols.map((c) => [c.key, c.label])), cols, y, true);
    y += 22;
    cnotes.forEach((c, i) => {
      if (y > 500) { doc.addPage(); y = 60; }
      if (i % 2 === 0) doc.rect(40, y - 4, cols.reduce((a, col) => a + col.width, 0), 18).fill('#f9f9ff');
      tableRow(doc, { ...c, dispatch_date: c.dispatch_date || 'N/A', arrival_date: c.arrival_date || 'N/A' }, cols, y);
      y += 18;
    });
    doc.moveDown(2).fillColor(BRAND_COLOR).fontSize(10).text(`Total C-Notes: ${cnotes.length}`);
    doc.end();
  } catch (e) { console.error('C-Note report error:', e); res.status(500).json({ error: 'C-Note report generation failed' }); }
};

// ─── SIV Report ────────────────────────────────────────────────────────────────
exports.sivReport = async (req, res) => {
  try {
    const { format = 'pdf', department, status, from_date, to_date } = req.query;
    let q = db('store_issue_vouchers').where({ 'store_issue_vouchers.org_id': req.user.org_id });
    if (department) q = q.where({ 'store_issue_vouchers.department': department });
    if (status) q = q.where({ 'store_issue_vouchers.status': status });
    if (from_date) q = q.where('store_issue_vouchers.date_issued', '>=', from_date);
    if (to_date) q = q.where('store_issue_vouchers.date_issued', '<=', to_date);
    const sivs = await q.orderBy('store_issue_vouchers.created_at', 'desc').limit(500);
    const org = await db('organizations').where({ id: req.user.org_id }).first();

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'SMIMP';
      const ws = wb.addWorksheet('SIVs');
      ws.columns = [
        { header: 'SIV #', key: 'siv_number', width: 18 },
        { header: 'Material', key: 'material_name', width: 28 },
        { header: 'Department', key: 'department', width: 20 },
        { header: 'Requested By', key: 'requested_by', width: 20 },
        { header: 'Approved By', key: 'approved_by_name', width: 20 },
        { header: 'Qty Issued', key: 'quantity_issued', width: 14 },
        { header: 'Date Issued', key: 'date_issued', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Remarks', key: 'remarks', width: 30 },
      ];
      ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6366F1' } };
      sivs.forEach((s) => ws.addRow(s));
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sivs_${Date.now()}.xlsx`);
      await wb.xlsx.write(res);
      return res.end();
    }

    if (format === 'csv') {
      const headers = ['SIV #', 'Material', 'Department', 'Requested By', 'Approved By', 'Qty Issued', 'Date Issued', 'Status', 'Remarks'];
      const rows = sivs.map((s) => [s.siv_number, s.material_name, s.department, s.requested_by, s.approved_by_name, s.quantity_issued, s.date_issued, s.status, s.remarks]);
      const csv = [headers, ...rows].map((r) => r.map((v) => `"${v ?? ''}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=sivs_${Date.now()}.csv`);
      return res.send(csv);
    }

    // PDF
    const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sivs_${Date.now()}.pdf`);
    doc.pipe(res);
    addPDFHeader(doc, 'Store Issue Vouchers (SIV) Report', org?.name);

    const cols = [
      { key: 'siv_number', label: 'SIV #', width: 85 },
      { key: 'material_name', label: 'Material', width: 140 },
      { key: 'department', label: 'Department', width: 100 },
      { key: 'requested_by', label: 'Requested By', width: 90 },
      { key: 'quantity_issued', label: 'Qty', width: 50 },
      { key: 'date_issued', label: 'Date', width: 75 },
      { key: 'status', label: 'Status', width: 65 },
      { key: 'approved_by_name', label: 'Approved By', width: 85 },
    ];

    let y = doc.y;
    tableRow(doc, Object.fromEntries(cols.map((c) => [c.key, c.label])), cols, y, true);
    y += 22;
    sivs.forEach((s, i) => {
      if (y > 500) { doc.addPage(); y = 60; }
      if (i % 2 === 0) doc.rect(40, y - 4, cols.reduce((a, col) => a + col.width, 0), 18).fill('#f9f9ff');
      tableRow(doc, { ...s, date_issued: s.date_issued || 'Pending', approved_by_name: s.approved_by_name || '—' }, cols, y);
      y += 18;
    });
    doc.moveDown(2).fillColor(BRAND_COLOR).fontSize(10).text(`Total SIVs: ${sivs.length}  |  Issued: ${sivs.filter(s => s.status === 'issued').length}  |  Pending: ${sivs.filter(s => s.status === 'pending').length}`);
    doc.end();
  } catch (e) { console.error('SIV report error:', e); res.status(500).json({ error: 'SIV report generation failed' }); }
};
