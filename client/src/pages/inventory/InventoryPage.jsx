import { useState, useEffect, useCallback } from 'react';
import { inventoryService, materialsService, warehousesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TXN_TYPES = ['stock_in', 'stock_out', 'transfer', 'adjustment', 'return', 'disposal'];
const TYPE_CONFIG = {
  stock_in:   { label: 'Stock In',   color: 'var(--accent)', icon: '↑' },
  stock_out:  { label: 'Stock Out',  color: 'var(--danger)', icon: '↓' },
  transfer:   { label: 'Transfer',   color: 'var(--info)',   icon: '⇄' },
  adjustment: { label: 'Adjustment', color: 'var(--warning)',icon: '≈' },
  return:     { label: 'Return',     color: 'var(--secondary)', icon: '↩' },
  disposal:   { label: 'Disposal',   color: 'var(--text-muted)', icon: '✕' },
};

function TransactionModal({ materials, warehouses, onClose, onSaved }) {
  const [form, setForm] = useState({ material_id: '', type: 'stock_in', quantity: '', to_location_id: '', from_location_id: '', notes: '', reference_number: '', unit_cost: '' });
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (warehouses.length > 0) {
      const allLocs = warehouses.flatMap(wh => (wh.locations || []).map(l => ({ ...l, warehouse_name: wh.name })));
      setLocations(allLocs);
    }
  }, [warehouses]);

  const f = (k) => ({ value: form[k] || '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.material_id || !form.quantity) { toast.error('Material and quantity are required'); return; }
    setLoading(true);
    try {
      await inventoryService.createTransaction(form);
      toast.success('Transaction recorded');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Transaction failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header"><h2 className="modal-title">📦 New Transaction</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Type selector */}
            <div>
              <label className="form-label required">Transaction Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 8 }}>
                {TXN_TYPES.map((t) => {
                  const cfg = TYPE_CONFIG[t];
                  return (
                    <button key={t} type="button"
                      style={{ padding: '10px 8px', borderRadius: 'var(--radius-md)', border: `2px solid ${form.type === t ? cfg.color : 'var(--border)'}`, background: form.type === t ? `${cfg.color}18` : 'transparent', cursor: 'pointer', color: form.type === t ? cfg.color : 'var(--text-secondary)', fontWeight: 600, fontSize: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                      onClick={() => setForm({ ...form, type: t })}
                      id={`txn-type-${t}`}
                    >
                      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Material</label>
                <select className="form-select" value={form.material_id} onChange={(e) => setForm({ ...form, material_id: e.target.value })} id="txn-material">
                  <option value="">— Select Material —</option>
                  {materials.map(m => <option key={m.id} value={m.id}>{m.name} — {m.quantity} {m.unit}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label required">Quantity</label>
                <input className="form-input" type="number" step="0.001" placeholder="0" {...f('quantity')} id="txn-qty" />
              </div>
            </div>

            {(form.type === 'transfer') && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">From Location</label>
                  <select className="form-select" {...f('from_location_id')}>
                    <option value="">— Select —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} › {l.zone}-{l.rack}-{l.shelf}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">To Location</label>
                  <select className="form-select" {...f('to_location_id')}>
                    <option value="">— Select —</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.warehouse_name} › {l.zone}-{l.rack}-{l.shelf}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group"><label className="form-label">Reference Number</label><input className="form-input" placeholder="PO#, GRN#, etc." {...f('reference_number')} /></div>
              <div className="form-group"><label className="form-label">Unit Cost (₹)</label><input className="form-input" type="number" placeholder="0.00" {...f('unit_cost')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" placeholder="Reason for transaction…" {...f('notes')} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="txn-submit">{loading ? <><div className="spinner" />Processing…</> : 'Record Transaction'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { canManage } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [materials, setMaterials] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await inventoryService.getTransactions({ page, limit: LIMIT, type: typeFilter });
      setTransactions(data.data || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, typeFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    materialsService.getAll({ limit: 200 }).then(({ data }) => setMaterials(data.data || [])).catch(() => {});
    warehousesService.getAll().then(({ data }) => setWarehouses(data || [])).catch(() => {});
  }, []);

  const stockIn = transactions.filter(t => t.type === 'stock_in').reduce((a, t) => a + +t.quantity, 0);
  const stockOut = transactions.filter(t => t.type === 'stock_out').reduce((a, t) => a + +t.quantity, 0);
  const transfers = transactions.filter(t => t.type === 'transfer').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🗃️ Inventory Management</h1>
          <p className="page-subtitle">{total.toLocaleString('en-IN')} total transactions</p>
        </div>
        <div className="page-actions">
          {canManage() && <button className="btn btn-primary" onClick={() => setModal(true)} id="new-txn-btn">+ New Transaction</button>}
        </div>
      </div>

      {/* Summary cards */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--accent)', '--kpi-color-bg': 'var(--accent-glow)' }}>
          <div className="kpi-header"><span className="kpi-label">Stock In (current view)</span><div className="kpi-icon">↑</div></div>
          <div className="kpi-value">{stockIn.toLocaleString('en-IN')}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--danger)', '--kpi-color-bg': 'var(--danger-glow)' }}>
          <div className="kpi-header"><span className="kpi-label">Stock Out (current view)</span><div className="kpi-icon">↓</div></div>
          <div className="kpi-value">{stockOut.toLocaleString('en-IN')}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--info)', '--kpi-color-bg': 'hsla(199,89%,60%,.12)' }}>
          <div className="kpi-header"><span className="kpi-label">Transfers</span><div className="kpi-icon">⇄</div></div>
          <div className="kpi-value">{transfers}</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': 'var(--primary)', '--kpi-color-bg': 'var(--primary-glow)' }}>
          <div className="kpi-header"><span className="kpi-label">Total Records</span><div className="kpi-icon">📊</div></div>
          <div className="kpi-value">{total.toLocaleString('en-IN')}</div>
        </div>
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <span className="card-title">Transaction History</span>
          <div className="table-toolbar-right">
            <select className="form-select" style={{ maxWidth: 160 }} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} id="txn-type-filter">
              <option value="">All Types</option>
              {TXN_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={load}>↻</button>
          </div>
        </div>
        <table>
          <thead><tr><th>Date & Time</th><th>Material</th><th>Type</th><th>Quantity</th><th>Reference</th><th>By</th><th>Notes</th></tr></thead>
          <tbody>
            {loading ? [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 16 }} /></td></tr>) :
              transactions.map((t) => {
                const cfg = TYPE_CONFIG[t.type];
                return (
                  <tr key={t.id}>
                    <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{t.created_at ? format(new Date(t.created_at), 'dd MMM yy, HH:mm') : '—'}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{t.material_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{t.mat_id}</div>
                    </td>
                    <td>
                      <span className="badge" style={{ background: `${cfg.color}20`, color: cfg.color }}>
                        {cfg.icon} {cfg.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: t.type === 'stock_in' ? 'var(--accent)' : t.type === 'stock_out' ? 'var(--danger)' : 'var(--text)' }}>
                      {t.type === 'stock_out' ? '−' : '+'}{Number(t.quantity).toLocaleString('en-IN')}
                    </td>
                    <td style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{t.reference_number || '—'}</td>
                    <td style={{ fontSize: 12 }}>{t.created_by_name || '—'}</td>
                    <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes || '—'}</td>
                  </tr>
                );
              })}
            {!loading && transactions.length === 0 && <tr><td colSpan={7} className="table-empty"><div className="table-empty-icon">🗃️</div><div className="table-empty-text">No transactions</div></td></tr>}
          </tbody>
        </table>
        {Math.ceil(total / LIMIT) > 1 && (
          <div className="pagination">
            <span className="pagination-info">Page {page} of {Math.ceil(total / LIMIT)}</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <button className="page-btn" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {modal && <TransactionModal materials={materials} warehouses={warehouses} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
    </div>
  );
}
