import { useState, useEffect, useCallback } from 'react';
import { usersService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = ['super_admin', 'org_admin', 'inventory_manager', 'quality_manager', 'warehouse_manager', 'store_keeper', 'viewer'];

function UserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', email: '', role: 'viewer', department: '', phone: '', password: '', ...user });
  const [loading, setLoading] = useState(false);
  const f = (k) => ({ value: form[k] || '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role) { toast.error('Name, email and role are required'); return; }
    if (!user?.id && !form.password) { toast.error('Password is required for new users'); return; }
    setLoading(true);
    try {
      if (user?.id) { await usersService.update(user.id, form); toast.success('User updated'); }
      else { await usersService.create(form); toast.success('User created'); }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2 className="modal-title">{user?.id ? '✏️ Edit User' : '👥 New User'}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-row">
              <div className="form-group"><label className="form-label required">Full Name</label><input className="form-input" placeholder="Full name" {...f('name')} id="user-name" /></div>
              <div className="form-group"><label className="form-label required">Email</label><input className="form-input" type="email" placeholder="user@org.com" {...f('email')} id="user-email" /></div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Role</label>
                <select className="form-select" {...f('role')} id="user-role">
                  {ROLES.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Department</label><input className="form-input" placeholder="Department" {...f('department')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" placeholder="+91-XXXXXXXXXX" {...f('phone')} /></div>
              {!user?.id && <div className="form-group"><label className="form-label required">Password</label><input className="form-input" type="password" placeholder="Min 6 characters" {...f('password')} id="user-password" /></div>}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="user-save-btn">{loading ? 'Saving…' : user?.id ? 'Update User' : 'Create User'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ROLE_COLORS = { super_admin: 'var(--danger)', org_admin: 'var(--secondary)', inventory_manager: 'var(--primary-light)', quality_manager: 'var(--info)', warehouse_manager: 'var(--accent)', store_keeper: 'var(--warning)', viewer: 'var(--text-muted)' };

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await usersService.getAll(); setUsers(data || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">👥 User Management</h1><p className="page-subtitle">{users.length} users in your organization</p></div>
        <div className="page-actions">
          {isAdmin() && <button className="btn btn-primary" onClick={() => setModal('create')} id="add-user-btn">+ New User</button>}
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-4)' }}>
        <input className="form-input" style={{ maxWidth: 300 }} placeholder="🔍 Search users…" value={search} onChange={(e) => setSearch(e.target.value)} id="user-search" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
        {loading ? [...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140 }} />) :
          filtered.map((u) => {
            const initials = u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
            const color = ROLE_COLORS[u.role] || 'var(--text-muted)';
            return (
              <div key={u.id} className="card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color, flexShrink: 0 }}>{initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span className="badge badge-dot" style={{ background: `${color}22`, color, fontSize: 10 }}>{u.role?.replace('_', ' ')}</span>
                      {u.department && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{u.department}</span>}
                      {!u.is_active && <span className="badge badge-danger" style={{ fontSize: 10 }}>Inactive</span>}
                    </div>
                  </div>
                  {isAdmin() && (
                    <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setModal(u)} id={`edit-user-${u.id}`}>✏️</button>
                  )}
                </div>
              </div>
            );
          })}
        {!loading && filtered.length === 0 && (
          <div style={{ gridColumn: '1/-1' }} className="card">
            <div className="table-empty"><div className="table-empty-icon">👥</div><div className="table-empty-text">No users found</div></div>
          </div>
        )}
      </div>

      {modal && <UserModal user={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
