import { useState, useEffect, useCallback } from 'react';
import { sivService, materialsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: '#f59e0b', approved: '#6366f1', issued: '#10b981', rejected: '#ef4444', returned: '#94a3b8' };
const STATUSES = ['pending', 'approved', 'issued', 'rejected', 'returned'];
const DEPARTMENTS = ['Assembly Line 1', 'Assembly Line 2', 'Assembly Line 3', 'Fabrication Shop', 'Maintenance', 'Safety Department', 'Quality Control', 'DTG', 'Stores', 'IT'];

export default function SIVPage() {
  const { canManage, isAdmin } = useAuth();
  const [sivs, setSIVs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [form, setForm] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await sivService.getAll({ page, limit: 15, search, status: statusFilter, department: deptFilter });
      setSIVs(data.data);
      setTotal(data.total);
    } catch { toast.error('Failed to load SIVs'); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, deptFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    materialsService.getAll({ limit: 200 }).then(({ data }) => setMaterials(data.data || data)).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ material_id: '', department: '', requested_by: '', quantity_issued: '', remarks: '' });
    setShowModal(true);
  };

  const openEdit = (siv) => {
    setEditing(siv);
    setForm({ material_id: siv.material_id || '', department: siv.department || '', requested_by: siv.requested_by || '', quantity_issued: siv.quantity_issued || '', remarks: siv.remarks || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await sivService.update(editing.id, form);
        toast.success('SIV updated');
      } else {
        await sivService.create(form);
        toast.success('SIV created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Operation failed'); }
  };

  const handleApprove = async (id) => {
    if (!confirm('Approve this SIV?')) return;
    try {
      await sivService.approve(id);
      toast.success('SIV approved');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Approval failed'); }
  };

  const handleIssue = async (id) => {
    if (!confirm('Issue material for this SIV? This will deduct inventory.')) return;
    try {
      await sivService.issue(id);
      toast.success('SIV issued — inventory deducted');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Issue failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this SIV?')) return;
    try {
      await sivService.delete(id);
      toast.success('SIV deleted');
      fetchData();
    } catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📝 Store Issue Vouchers (SIV)</h1>
          <p className="page-subtitle">Track material issued from inventory to departments</p>
        </div>
        {canManage() && (
          <div className="page-actions">
            <button className="btn btn-primary" onClick={openCreate} id="create-siv-btn">+ New SIV</button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="table-toolbar" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flex: 1, flexWrap: 'wrap' }}>
          <input className="form-input" placeholder="Search SIVs..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 260 }} id="siv-search" />
          <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ maxWidth: 160 }} id="siv-status-filter">
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" value={deptFilter} onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }} style={{ maxWidth: 200 }} id="siv-dept-filter">
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
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
              <th>SIV #</th>
              <th>Material</th>
              <th>Department</th>
              <th>Requested By</th>
              <th>Approved By</th>
              <th>Qty Issued</th>
              <th>Date Issued</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}><div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-6)' }}><div className="spinner" /></div></td></tr>
            ) : sivs.length === 0 ? (
              <tr><td colSpan={9} className="table-empty"><div className="table-empty-icon">📝</div><div className="table-empty-text">No SIVs found</div></td></tr>
            ) : sivs.map((siv) => (
              <tr key={siv.id}>
                <td><span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{siv.siv_number}</span></td>
                <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{siv.material_name}</td>
                <td><span className="badge badge-neutral">{siv.department}</span></td>
                <td>{siv.requested_by}</td>
                <td>{siv.approved_by_name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(siv.quantity_issued).toLocaleString('en-IN')}</td>
                <td style={{ fontSize: 12 }}>{siv.date_issued || <span style={{ color: 'var(--text-muted)' }}>Pending</span>}</td>
                <td><span className="badge" style={{ background: `${STATUS_COLORS[siv.status] || '#888'}22`, color: STATUS_COLORS[siv.status] || '#888' }}>{siv.status}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                    {siv.status === 'pending' && isAdmin() && (
                      <button className="btn btn-sm" style={{ background: '#6366f122', color: '#6366f1', border: '1px solid #6366f144' }} onClick={() => handleApprove(siv.id)} title="Approve">✓ Approve</button>
                    )}
                    {siv.status === 'approved' && canManage() && (
                      <button className="btn btn-sm" style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }} onClick={() => handleIssue(siv.id)} title="Issue">📦 Issue</button>
                    )}
                    {siv.status === 'pending' && canManage() && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(siv)} title="Edit">✏️</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(siv.id)} title="Delete">🗑️</button>
                      </>
                    )}
                  </div>
                </td>
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
          <div className="card" style={{ width: '100%', maxWidth: 540, maxHeight: '90vh', overflow: 'auto', animation: 'slideUp 0.3s ease' }} onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <span className="card-title">{editing ? 'Edit SIV' : 'Create New SIV'}</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', padding: 'var(--space-4)' }}>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Material *</label>
                  <select className="form-select" value={form.material_id} onChange={e => setForm({...form, material_id: e.target.value})} required>
                    <option value="">Select Material</option>
                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.material_id}) — Qty: {m.quantity} {m.unit}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select className="form-select" value={form.department} onChange={e => setForm({...form, department: e.target.value})} required>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Requested By *</label>
                  <input className="form-input" value={form.requested_by} onChange={e => setForm({...form, requested_by: e.target.value})} placeholder="Person requesting" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity to Issue *</label>
                  <input className="form-input" type="number" step="any" min="0.01" value={form.quantity_issued} onChange={e => setForm({...form, quantity_issued: e.target.value})} required />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Remarks</label>
                  <textarea className="form-input" rows={2} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} placeholder="Purpose / justification" />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editing ? 'Update SIV' : 'Create SIV'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
