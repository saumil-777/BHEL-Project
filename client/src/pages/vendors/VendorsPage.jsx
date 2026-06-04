import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function VendorModal({ vendor, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', rating: 4, status: 'active', notes: '', ...vendor });
  const [loading, setLoading] = useState(false);
  const f = (k) => ({ value: form[k] || '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Vendor name is required'); return; }
    setLoading(true);
    try {
      if (vendor?.id) { await vendorsService.update(vendor.id, form); toast.success('Vendor updated'); }
      else { await vendorsService.create(form); toast.success('Vendor added'); }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{vendor?.id ? '✏️ Edit Vendor' : '🏭 New Vendor'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-row">
              <div className="form-group"><label className="form-label required">Vendor Name</label><input className="form-input" placeholder="Company name" {...f('name')} id="vendor-name" /></div>
              <div className="form-group"><label className="form-label">Contact Person</label><input className="form-input" placeholder="Name" {...f('contact_person')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="vendor@company.com" {...f('email')} /></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+91-XXXXXXXXXX" {...f('phone')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Rating (0-5)</label><input className="form-input" type="number" min="0" max="5" step="0.1" {...f('rating')} /></div>
              <div className="form-group"><label className="form-label">Status</label><select className="form-select" {...f('status')}><option value="active">Active</option><option value="inactive">Inactive</option><option value="blacklisted">Blacklisted</option></select></div>
            </div>
            <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" placeholder="Full address" {...f('address')} /></div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" placeholder="Internal notes" {...f('notes')} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><div className="spinner" /> Saving…</> : vendor?.id ? 'Update' : 'Create Vendor'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StarRating({ rating }) {
  return (
    <span style={{ color: 'var(--warning)', fontSize: 13 }}>
      {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
      <span style={{ color: 'var(--text-muted)', marginLeft: 4, fontSize: 12 }}>{Number(rating).toFixed(1)}</span>
    </span>
  );
}

export default function VendorsPage() {
  const navigate = useNavigate();
  const { canManage } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await vendorsService.getAll({ search, limit: 50 });
      setVendors(data.data || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this vendor?')) return;
    try { await vendorsService.delete(id); toast.success('Vendor deleted'); load(); }
    catch (err) { toast.error(err.response?.data?.error || 'Delete failed'); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏭 Vendors</h1>
          <p className="page-subtitle">{total} vendors registered</p>
        </div>
        <div className="page-actions">
          {canManage() && <button className="btn btn-primary" onClick={() => setModal('create')} id="add-vendor-btn">+ New Vendor</button>}
        </div>
      </div>

      {/* Vendor cards grid */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <input className="form-input" style={{ maxWidth: 320 }} placeholder="🔍 Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} id="vendor-search" />
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
          {vendors.map((v) => (
            <div key={v.id} className="card" style={{ cursor: 'pointer', transition: 'all var(--transition-normal)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              onClick={() => navigate(`/vendors/${v.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏭</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.contact_person}</div>
                  </div>
                </div>
                <span className={`badge ${v.status === 'active' ? 'badge-success' : v.status === 'blacklisted' ? 'badge-danger' : 'badge-neutral'}`} style={{ flexShrink: 0 }}>{v.status}</span>
              </div>
              <StarRating rating={v.rating || 0} />
              <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--text-secondary)' }}>
                {v.email && <span>✉️ {v.email}</span>}
                {v.phone && <span>📞 {v.phone}</span>}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }} onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-secondary btn-sm" onClick={() => setModal(v)} id={`edit-vendor-${v.id}`}>✏️ Edit</button>
                {canManage() && <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(v.id)} style={{ color: 'var(--danger)' }}>🗑️</button>}
              </div>
            </div>
          ))}
          {vendors.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 'var(--space-3)' }}>🏭</div>
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>No vendors found</div>
            </div>
          )}
        </div>
      )}

      {modal && <VendorModal vendor={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
