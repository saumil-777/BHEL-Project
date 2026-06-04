import { useState, useEffect, useCallback } from 'react';
import { movementsService, materialsService, warehousesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

function MovementModal({ materials, warehouses, onClose, onSaved }) {
  const [form, setForm] = useState({ material_id: '', from_warehouse: '', to_warehouse: '', department: '', reason: '' });
  const [loading, setLoading] = useState(false);
  const f = (k) => ({ value: form[k] || '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.material_id) { toast.error('Select a material'); return; }
    setLoading(true);
    try {
      await movementsService.create(form);
      toast.success('Movement recorded');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2 className="modal-title">🔄 Record Movement</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group"><label className="form-label required">Material</label><select className="form-select" value={form.material_id} onChange={(e) => setForm({ ...form, material_id: e.target.value })} id="mv-material"><option value="">— Select —</option>{materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.material_id})</option>)}</select></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">From Warehouse</label><select className="form-select" {...f('from_warehouse')}><option value="">— Select —</option>{warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}</select></div>
              <div className="form-group"><label className="form-label">To Warehouse</label><select className="form-select" {...f('to_warehouse')}><option value="">— Select —</option>{warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}</select></div>
            </div>
            <div className="form-group"><label className="form-label">Department</label><input className="form-input" placeholder="Receiving department" {...f('department')} /></div>
            <div className="form-group"><label className="form-label">Reason</label><textarea className="form-textarea" placeholder="Reason for movement" {...f('reason')} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Recording…' : 'Record Movement'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MovementsPage() {
  const { canManage } = useAuth();
  const [movements, setMovements] = useState([]);
  const [total, setTotal] = useState(0);
  const [materials, setMaterials] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await movementsService.getAll({ page, limit: LIMIT });
      setMovements(data.data || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    materialsService.getAll({ limit: 200 }).then(({ data }) => setMaterials(data.data || [])).catch(() => {});
    warehousesService.getAll().then(({ data }) => setWarehouses(data || [])).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">🔄 Material Movements</h1><p className="page-subtitle">{total} movement records</p></div>
        <div className="page-actions">
          {canManage() && <button className="btn btn-primary" onClick={() => setModal(true)} id="add-movement-btn">+ Record Movement</button>}
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead><tr><th>Date</th><th>Material</th><th>From</th><th>To</th><th>Department</th><th>Moved By</th><th>Reason</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: 16 }} /></td></tr>) :
              movements.map((m) => (
                <tr key={m.id}>
                  <td style={{ fontSize: 12 }}>{m.moved_at ? format(new Date(m.moved_at), 'dd MMM yyyy, HH:mm') : '—'}</td>
                  <td><div style={{ fontWeight: 600, fontSize: 13 }}>{m.material_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.mat_id}</div></td>
                  <td><span className="badge badge-neutral">{m.from_warehouse || '—'}</span></td>
                  <td><span className="badge badge-primary">{m.to_warehouse || '—'}</span></td>
                  <td>{m.department || '—'}</td>
                  <td style={{ fontSize: 12 }}>{m.moved_by_name || '—'}</td>
                  <td style={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.reason || '—'}</td>
                </tr>
              ))}
            {!loading && movements.length === 0 && <tr><td colSpan={7} className="table-empty"><div className="table-empty-icon">🔄</div><div className="table-empty-text">No movements recorded</div></td></tr>}
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

      {modal && <MovementModal materials={materials} warehouses={warehouses} onClose={() => setModal(false)} onSaved={() => { setModal(false); load(); }} />}
    </div>
  );
}
