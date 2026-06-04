import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { purchaseOrderService, vendorsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const PO_STATUSES = ['draft', 'sent', 'acknowledged', 'partial', 'received', 'closed', 'cancelled'];
const STATUS_CONFIG = {
  draft: { color: 'var(--text-muted)', bg: 'var(--surface-3)' },
  sent: { color: 'var(--info)', bg: 'hsla(199,89%,60%,.15)' },
  acknowledged: { color: 'var(--primary-light)', bg: 'var(--primary-glow)' },
  partial: { color: 'var(--warning)', bg: 'hsla(38,92%,58%,.15)' },
  received: { color: 'var(--accent)', bg: 'var(--accent-glow)' },
  closed: { color: 'var(--text-muted)', bg: 'var(--surface-2)' },
  cancelled: { color: 'var(--danger)', bg: 'var(--danger-glow)' },
};

function POModal({ vendors, onClose, onSaved }) {
  const [form, setForm] = useState({ vendor_id: '', order_date: new Date().toISOString().split('T')[0], expected_delivery: '', notes: '', terms: '', subtotal: 0, tax: 0, discount: 0, total: 0 });
  const [items, setItems] = useState([{ description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0 }]);
  const [loading, setLoading] = useState(false);

  const updateItem = (idx, key, value) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], [key]: value };
    if (key === 'quantity' || key === 'unit_price') {
      newItems[idx].total = (newItems[idx].quantity || 0) * (newItems[idx].unit_price || 0);
    }
    setItems(newItems);
    const subtotal = newItems.reduce((a, i) => a + +(i.total || 0), 0);
    setForm(f => ({ ...f, subtotal, total: subtotal + +(f.tax || 0) - +(f.discount || 0) }));
  };

  const addItem = () => setItems([...items, { description: '', quantity: 1, unit: 'pcs', unit_price: 0, total: 0 }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendor_id) { toast.error('Select a vendor'); return; }
    setLoading(true);
    try {
      await purchaseOrderService.create({ ...form, items });
      toast.success('Purchase order created');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl">
        <div className="modal-header"><h2 className="modal-title">🧾 New Purchase Order</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-row">
              <div className="form-group"><label className="form-label required">Vendor</label><select className="form-select" value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })} id="po-vendor"><option value="">— Select Vendor —</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Order Date</label><input className="form-input" type="date" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Expected Delivery</label><input className="form-input" type="date" value={form.expected_delivery} onChange={(e) => setForm({ ...form, expected_delivery: e.target.value })} /></div>
            </div>

            {/* Line Items */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <label className="form-label" style={{ margin: 0 }}>Line Items</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItem} id="add-po-item">+ Add Item</button>
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <table style={{ width: '100%' }}>
                  <thead style={{ background: 'var(--surface-2)' }}>
                    <tr>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)' }}>Description</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', width: 80 }}>Qty</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', width: 80 }}>Unit</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', width: 120 }}>Unit Price</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', width: 100 }}>Total</th>
                      <th style={{ width: 36 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} style={{ borderTop: '1px solid var(--border)' }}>
                        <td style={{ padding: '4px 8px' }}><input className="form-input" style={{ border: 'none', background: 'transparent', padding: '4px 4px' }} placeholder="Item description" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} /></td>
                        <td style={{ padding: '4px 8px' }}><input className="form-input" type="number" style={{ border: 'none', background: 'transparent', padding: '4px 4px' }} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', +e.target.value)} /></td>
                        <td style={{ padding: '4px 8px' }}><select className="form-select" style={{ border: 'none', background: 'transparent', padding: '4px 4px' }} value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)}>{['pcs', 'kg', 'tons', 'meters', 'liters', 'boxes', 'sets'].map(u => <option key={u}>{u}</option>)}</select></td>
                        <td style={{ padding: '4px 8px' }}><input className="form-input" type="number" style={{ border: 'none', background: 'transparent', padding: '4px 4px' }} placeholder="₹" value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', +e.target.value)} /></td>
                        <td style={{ padding: '4px 8px', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>₹{Number(item.total || 0).toLocaleString('en-IN')}</td>
                        <td style={{ padding: '4px 8px' }}>{items.length > 1 && <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeItem(idx)}>✕</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[['Subtotal', `₹${Number(form.subtotal).toLocaleString('en-IN')}`], ['Tax (₹)', null], ['Discount (₹)', null]].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                    {value ? <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{value}</span> :
                      <input className="form-input" type="number" style={{ width: 100, textAlign: 'right' }} placeholder="0"
                        value={label.includes('Tax') ? form.tax : form.discount}
                        onChange={(e) => {
                          const key = label.includes('Tax') ? 'tax' : 'discount';
                          const val = +e.target.value;
                          setForm(f => ({ ...f, [key]: val, total: f.subtotal + (key === 'tax' ? val : f.tax) - (key === 'discount' ? val : f.discount) }));
                        }}
                      />
                    }
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '2px solid var(--border)', fontSize: 16, fontWeight: 800 }}>
                  <span>Total</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>₹{Number(form.total).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" placeholder="Delivery notes, special instructions…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Terms & Conditions</label><textarea className="form-textarea" placeholder="Payment terms, warranty, etc." value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="po-submit">{loading ? 'Creating…' : '🧾 Create Purchase Order'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [pos, setPOs] = useState([]);
  const [total, setTotal] = useState(0);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await purchaseOrderService.getAll({ page, limit: LIMIT, status: statusFilter });
      setPOs(data.data || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { vendorsService.getAll({ limit: 100 }).then(({ data }) => setVendors(data.data || [])).catch(() => {}); }, []);

  const updateStatus = async (po, status) => {
    try {
      await purchaseOrderService.update(po.id, { status });
      toast.success(`PO ${status}`);
      load();
    } catch { toast.error('Update failed'); }
  };

  const totalValue = pos.reduce((a, p) => a + +(p.total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🧾 Purchase Orders</h1>
          <p className="page-subtitle">{total} orders · ₹{totalValue.toLocaleString('en-IN')} total value</p>
        </div>
        <div className="page-actions">
          {canManage() && <button className="btn btn-primary" onClick={() => setModal(true)} id="create-po-btn">+ New PO</button>}
        </div>
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
        <button className={`btn btn-sm ${statusFilter === '' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setStatusFilter(''); setPage(1); }}>All</button>
        {PO_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s];
          return (
            <button key={s} className="btn btn-sm"
              style={{ background: statusFilter === s ? cfg.bg : 'var(--surface-2)', color: statusFilter === s ? cfg.color : 'var(--text-secondary)', border: `1px solid ${statusFilter === s ? cfg.color : 'var(--border)'}`, textTransform: 'capitalize' }}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              id={`po-filter-${s}`}
            >{s}</button>
          );
        })}
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>PO Number</th><th>Vendor</th><th>Status</th><th>Order Date</th><th>Expected Delivery</th><th>Total (₹)</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? [...Array(6)].map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 16 }} /></td></tr>) :
              pos.map((po) => {
                const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.draft;
                return (
                  <tr key={po.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{po.po_number}</code></td>
                    <td style={{ fontWeight: 600 }}>{po.vendor_name}</td>
                    <td><span className="badge" style={{ background: cfg.bg, color: cfg.color, textTransform: 'capitalize' }}>{po.status}</span></td>
                    <td style={{ fontSize: 12 }}>{po.order_date ? format(new Date(po.order_date), 'dd MMM yyyy') : '—'}</td>
                    <td style={{ fontSize: 12 }}>{po.expected_delivery ? format(new Date(po.expected_delivery), 'dd MMM yyyy') : '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>₹{Number(po.total || 0).toLocaleString('en-IN')}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {po.status === 'draft' && canManage() && <button className="btn btn-primary btn-sm" onClick={() => updateStatus(po, 'sent')} id={`po-send-${po.id}`}>Send</button>}
                        {po.status === 'sent' && canManage() && <button className="btn btn-secondary btn-sm" onClick={() => updateStatus(po, 'received')}>Mark Received</button>}
                        {!['closed', 'cancelled'].includes(po.status) && canManage() && (
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => updateStatus(po, 'cancelled')}>Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            {!loading && pos.length === 0 && <tr><td colSpan={7} className="table-empty"><div className="table-empty-icon">🧾</div><div className="table-empty-text">No purchase orders</div></td></tr>}
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

      {modal && <POModal vendors={vendors} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
    </div>
  );
}
