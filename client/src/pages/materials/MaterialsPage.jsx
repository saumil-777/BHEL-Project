import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialsService, vendorsService, warehousesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  received: '#6366f1', under_review: '#f59e0b', quality_check: '#8b5cf6',
  approved: '#10b981', stored: '#3b82f6', issued: '#ef4444', rejected: '#ef4444',
};

const STATUSES = ['received', 'under_review', 'quality_check', 'approved', 'stored', 'issued', 'rejected'];
const UNITS = ['pcs', 'kg', 'tons', 'meters', 'liters', 'boxes', 'sets', 'rolls', 'sheets', 'units'];

function MaterialModal({ material, vendors, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', category: '', sku: '', vendor_id: '', quantity: '', unit: 'pcs',
    cost: '', location_id: '', status: 'received', description: '', brand: '',
    min_stock_level: '', reorder_level: '', hsn_code: '', serial_number: '', batch_number: '',
    ...material,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Material name is required'); return; }
    setLoading(true);
    try {
      if (material?.id) {
        await materialsService.update(material.id, form);
        toast.success('Material updated');
      } else {
        await materialsService.create(form);
        toast.success('Material created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save material');
    } finally { setLoading(false); }
  };

  const f = (k) => ({ value: form[k] || '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">{material?.id ? '✏️ Edit Material' : '📦 New Material'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Material Name</label>
                <input className="form-input" placeholder="e.g. Copper Cable 25mm²" {...f('name')} id="mat-name" />
              </div>
              <div className="form-group">
                <label className="form-label">Category</label>
                <input className="form-input" placeholder="e.g. Electrical" {...f('category')} id="mat-category" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SKU</label>
                <input className="form-input" placeholder="Stock Keeping Unit" {...f('sku')} id="mat-sku" />
              </div>
              <div className="form-group">
                <label className="form-label">HSN Code</label>
                <input className="form-input" placeholder="HSN/SAC Code" {...f('hsn_code')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vendor</label>
                <select className="form-select" {...f('vendor_id')} id="mat-vendor">
                  <option value="">— Select Vendor —</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" {...f('status')} id="mat-status">
                  {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Quantity</label>
                <input className="form-input" type="number" placeholder="0" {...f('quantity')} id="mat-qty" />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-select" {...f('unit')}>
                  {UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Unit Cost (₹)</label>
                <input className="form-input" type="number" placeholder="0.00" {...f('cost')} id="mat-cost" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Min Stock Level</label>
                <input className="form-input" type="number" placeholder="Alert threshold" {...f('min_stock_level')} />
              </div>
              <div className="form-group">
                <label className="form-label">Reorder Level</label>
                <input className="form-input" type="number" placeholder="Reorder threshold" {...f('reorder_level')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Brand</label>
                <input className="form-input" placeholder="Brand name" {...f('brand')} />
              </div>
              <div className="form-group">
                <label className="form-label">Serial Number</label>
                <input className="form-input" placeholder="Serial #" {...f('serial_number')} />
              </div>
              <div className="form-group">
                <label className="form-label">Batch Number</label>
                <input className="form-input" placeholder="Batch #" {...f('batch_number')} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" placeholder="Material description, specifications…" {...f('description')} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="mat-save-btn">
              {loading ? <><div className="spinner" /> Saving…</> : material?.id ? 'Update Material' : 'Create Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | material object
  const [selectedIds, setSelectedIds] = useState([]);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await materialsService.getAll({ page, limit: LIMIT, search, category, status });
      setMaterials(data.data);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  }, [page, search, category, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    materialsService.getCategories().then(({ data }) => setCategories(data)).catch(() => {});
    vendorsService.getAll({ limit: 100 }).then(({ data }) => setVendors(data.data || [])).catch(() => {});
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this material? This action cannot be undone.')) return;
    try {
      await materialsService.delete(id);
      toast.success('Material deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Materials</h1>
          <p className="page-subtitle">{total.toLocaleString('en-IN')} materials registered in inventory</p>
        </div>
        <div className="page-actions">
          {canManage() && <button className="btn btn-secondary" onClick={() => navigate('/qr')} id="materials-qr-btn">📱 QR Scan</button>}
          {canManage() && <button className="btn btn-primary" onClick={() => setModal('create')} id="materials-add-btn">+ New Material</button>}
        </div>
      </div>

      {/* Filters */}
      <div className="table-wrapper">
        <div className="table-toolbar">
          <input className="form-input" style={{ maxWidth: 280 }} placeholder="🔍 Search name, ID, SKU…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} id="materials-search" />
          <select className="form-select" style={{ maxWidth: 180 }} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} id="materials-category-filter">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="form-select" style={{ maxWidth: 160 }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} id="materials-status-filter">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <div className="table-toolbar-right">
            <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th><input type="checkbox" onChange={(e) => setSelectedIds(e.target.checked ? materials.map(m => m.id) : [])} /></th>
              <th>Material ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Vendor</th>
              <th>Qty / Unit</th>
              <th>Value (₹)</th>
              <th>Status</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}><td colSpan={10}><div className="skeleton" style={{ height: 16, margin: '4px 0' }} /></td></tr>
              ))
            ) : materials.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="table-empty">
                  <div className="table-empty-icon">📦</div>
                  <div className="table-empty-text">No materials found</div>
                  <div className="table-empty-sub">{search ? 'Try a different search term' : 'Add your first material to get started'}</div>
                </div>
              </td></tr>
            ) : materials.map((m) => (
              <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/materials/${m.id}`)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(m.id)} onChange={(e) => setSelectedIds(e.target.checked ? [...selectedIds, m.id] : selectedIds.filter(id => id !== m.id))} />
                </td>
                <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{m.material_id}</code></td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{m.name}</div>
                  {m.sku && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {m.sku}</div>}
                </td>
                <td><span className="badge badge-neutral">{m.category || '—'}</span></td>
                <td style={{ fontSize: 12 }}>{m.vendor_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <span style={{ color: +m.quantity <= +m.min_stock_level && m.min_stock_level > 0 ? 'var(--warning)' : 'var(--text)' }}>
                    {Number(m.quantity).toLocaleString('en-IN')}
                  </span> {m.unit}
                  {+m.quantity <= +m.min_stock_level && m.min_stock_level > 0 && <span style={{ marginLeft: 4 }}>⚠️</span>}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent)' }}>₹{Number(m.total_value || 0).toLocaleString('en-IN')}</td>
                <td>
                  <span className="badge badge-dot" style={{ background: `${STATUS_COLORS[m.status] || '#888'}22`, color: STATUS_COLORS[m.status] || 'var(--text-secondary)' }}>
                    {m.status?.replace('_', ' ')}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>
                  {m.warehouse_name ? <div><div style={{ fontWeight: 500 }}>{m.warehouse_name}</div><div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{m.zone}-{m.rack}-{m.shelf}</div></div> : '—'}
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(m)} title="Edit" id={`edit-mat-${m.id}`}>✏️</button>
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => navigate(`/qr?material=${m.id}`)} title="QR Code">📱</button>
                    {canManage() && <button className="btn btn-ghost btn-sm btn-icon" onClick={() => handleDelete(m.id)} title="Delete" style={{ color: 'var(--danger)' }}>🗑️</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <span className="pagination-info">Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total.toLocaleString('en-IN')}</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                const p = i + 1;
                return <button key={p} className={`page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>;
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <MaterialModal
          material={modal === 'create' ? null : modal}
          vendors={vendors}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
