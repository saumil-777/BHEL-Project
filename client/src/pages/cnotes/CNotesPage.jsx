import { useState, useEffect, useCallback } from 'react';
import { cnoteService, vendorsService, materialsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_COLORS = { draft: '#94a3b8', in_transit: '#f59e0b', received: '#10b981', verified: '#6366f1', rejected: '#ef4444' };
const STATUSES = ['draft', 'in_transit', 'received', 'verified', 'rejected'];

export default function CNotesPage() {
  const { canManage } = useAuth();
  const [cnotes, setCNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await cnoteService.getAll({ page, limit: 15, search, status: statusFilter, vendor_id: vendorFilter });
      setCNotes(data.data);
      setTotal(data.total);
    } catch { toast.error('Failed to load C-Notes'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, vendorFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    vendorsService.getAll({ limit: 100 }).then(({ data }) => setVendors(data.data)).catch(() => {});
    materialsService.getAll({ limit: 200 }).then(({ data }) => setMaterials(data.data || data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ vendor_id: '', material_id: '', quantity: '', transporter_name: '', vehicle_number: '', dispatch_date: '', arrival_date: '', po_number: '', invoice_number: '', status: 'draft', remarks: '', vendor_code: '' });
    setShowModal(true);
  };

  const openEdit = (cn) => {
    setEditing(cn);
    setForm({ vendor_id: cn.vendor_id || '', material_id: cn.material_id || '', quantity: cn.quantity || '', transporter_name: cn.transporter_name || '', vehicle_number: cn.vehicle_number || '', dispatch_date: cn.dispatch_date || '', arrival_date: cn.arrival_date || '', po_number: cn.po_number || '', invoice_number: cn.invoice_number || '', status: cn.status || 'draft', remarks: cn.remarks || '', vendor_code: cn.vendor_code || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await cnoteService.update(editing.id, form);
        toast.success('C-Note updated');
      } else {
        await cnoteService.create(form);
        toast.success('C-Note created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Operation failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this C-Note?')) return;
    try {
      await cnoteService.delete(id);
      toast.success('C-Note deleted');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📜 Consignment Notes (C-Notes)</h1>
          <p className="page-subtitle">Track materials received from vendors with transportation records</p>
        </div>
        {canManage() && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={openCreate} id="create-cnote-btn">+ New C-Note</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="table-toolbar" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, flexWrap: 'wrap' }}>
          <input className="form-input" placeholder="Search C-Notes..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 260 }} id="cnote-search" />
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: 160 }} id="cnote-status-filter">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select className="form-select" value={vendorFilter} onChange={(e) => { setVendorFilter(e.target.value); setPage(1); }} style={{ maxWidth: 200 }} id="cnote-vendor-filter">
            <option value="">All Vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <div className="table-toolbar-right">
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{total} record{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>C-Note #</th>
              <th>Vendor</th>
              <th>Material</th>
              <th>Qty</th>
              <th>Transporter</th>
              <th>Vehicle</th>
              <th>Dispatch</th>
              <th>Arrival</th>
              <th>PO #</th>
              <th>Invoice #</th>
              <th>Status</th>
              {canManage() && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={12}><div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}><div className="spinner" /></div></td></tr>
            ) : cnotes.length === 0 ? (
              <tr><td colSpan={12} className="table-empty"><div className="table-empty-icon">📜</div><div className="table-empty-text">No C-Notes found</div></td></tr>
            ) : cnotes.map((cn) => (
              <tr key={cn.id}>
                <td><span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{cn.cnote_number}</span></td>
                <td><div style={{ fontWeight: 600, fontSize: 13 }}>{cn.vendor_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cn.vendor_code}</div></td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cn.material_name}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(cn.quantity).toLocaleString('en-IN')} {cn.unit}</td>
                <td>{cn.transporter_name}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{cn.vehicle_number}</td>
                <td style={{ fontSize: 12 }}>{cn.dispatch_date || '—'}</td>
                <td style={{ fontSize: 12 }}>{cn.arrival_date || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{cn.po_number || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{cn.invoice_number || '—'}</td>
                <td><span className="badge" style={{ background: `${STATUS_COLORS[cn.status] || '#888'}22`, color: STATUS_COLORS[cn.status] || '#888' }}>{cn.status?.replace('_', ' ')}</span></td>
                {canManage() && (
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(cn)} title="Edit">✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cn.id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'hsla(229,22%,3%,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setShowModal(false)}>
          <div className="card" style={{ width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', animation: 'slideUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">{editing ? 'Edit C-Note' : 'Create New C-Note'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label">Vendor *</label>
                  <select className="form-select" value={form.vendor_id} onChange={e => setForm({...form, vendor_id: e.target.value})} required>
                    <option value="">Select Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Vendor Code</label>
                  <input className="form-input" value={form.vendor_code} onChange={e => setForm({...form, vendor_code: e.target.value})} placeholder="e.g. V-TATA" />
                </div>
                <div className="form-group">
                  <label className="form-label">Material *</label>
                  <select className="form-select" value={form.material_id} onChange={e => setForm({...form, material_id: e.target.value})} required>
                    <option value="">Select Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.material_id})</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input className="form-input" type="number" step="any" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Transporter Name</label>
                  <input className="form-input" value={form.transporter_name} onChange={e => setForm({...form, transporter_name: e.target.value})} placeholder="e.g. Blue Dart" />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Number</label>
                  <input className="form-input" value={form.vehicle_number} onChange={e => setForm({...form, vehicle_number: e.target.value})} placeholder="e.g. MH-01-AB-1234" />
                </div>
                <div className="form-group">
                  <label className="form-label">Dispatch Date</label>
                  <input className="form-input" type="date" value={form.dispatch_date} onChange={e => setForm({...form, dispatch_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Arrival Date</label>
                  <input className="form-input" type="date" value={form.arrival_date} onChange={e => setForm({...form, arrival_date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">PO Number</label>
                  <input className="form-input" value={form.po_number} onChange={e => setForm({...form, po_number: e.target.value})} placeholder="e.g. PO-2024-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Invoice Number</label>
                  <input className="form-input" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} placeholder="e.g. INV-001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Remarks</label>
                  <textarea className="form-input" rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update C-Note' : 'Create C-Note'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
