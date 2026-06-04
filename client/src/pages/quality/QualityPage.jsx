import { useState, useEffect, useCallback } from 'react';
import { qualityService, materialsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const RESULTS = ['pending', 'pass', 'fail', 'conditional'];

function InspectionModal({ materials, onClose, onSaved }) {
  const [form, setForm] = useState({ material_id: '', notes: '', quantity_inspected: '', quantity_passed: '', quantity_failed: '' });
  const [loading, setLoading] = useState(false);
  const f = (k) => ({ value: form[k] || '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.material_id) { toast.error('Select a material'); return; }
    setLoading(true);
    try {
      await qualityService.createInspection(form);
      toast.success('Inspection created');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2 className="modal-title">🔬 New Inspection</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label required">Material</label>
              <select className="form-select" value={form.material_id} onChange={(e) => setForm({ ...form, material_id: e.target.value })} id="insp-material">
                <option value="">— Select Material —</option>
                {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.material_id})</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Qty Inspected</label><input className="form-input" type="number" {...f('quantity_inspected')} /></div>
              <div className="form-group"><label className="form-label">Qty Passed</label><input className="form-input" type="number" {...f('quantity_passed')} /></div>
              <div className="form-group"><label className="form-label">Qty Failed</label><input className="form-input" type="number" {...f('quantity_failed')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" placeholder="Inspection findings…" {...f('notes')} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? <><div className="spinner" />Creating…</> : 'Create Inspection'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResultUpdateModal({ inspection, onClose, onSaved }) {
  const [result, setResult] = useState(inspection.result || 'pending');
  const [notes, setNotes] = useState(inspection.notes || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await qualityService.updateInspection(inspection.id, { result, notes });
      toast.success('Inspection updated');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2 className="modal-title">✅ Update Result — {inspection.inspection_number}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 'var(--space-3)' }}>
              {RESULTS.map((r) => (
                <button key={r} type="button"
                  style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: `2px solid ${result === r ? (r === 'pass' ? 'var(--accent)' : r === 'fail' ? 'var(--danger)' : r === 'conditional' ? 'var(--warning)' : 'var(--primary)') : 'var(--border)'}`, background: result === r ? 'var(--surface-2)' : 'transparent', cursor: 'pointer', color: 'var(--text)', fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}
                  onClick={() => setResult(r)}
                  id={`result-${r}`}
                >
                  {r === 'pass' ? '✅' : r === 'fail' ? '❌' : r === 'pending' ? '⏳' : '⚠️'} {r}
                </button>
              ))}
            </div>
            <div className="form-group"><label className="form-label">Notes / Findings</label><textarea className="form-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Updating…' : 'Update Result'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QualityPage() {
  const { canManage } = useAuth();
  const [inspections, setInspections] = useState([]);
  const [total, setTotal] = useState(0);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [updateModal, setUpdateModal] = useState(null);
  const [resultFilter, setResultFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await qualityService.getInspections({ result: resultFilter, limit: 50 });
      setInspections(data.data || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [resultFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { materialsService.getAll({ limit: 200 }).then(({ data }) => setMaterials(data.data || [])).catch(() => {}); }, []);

  const RESULT_CONFIG = { pass: { label: '✅ Pass', color: 'var(--accent)', bg: 'var(--accent-glow)' }, fail: { label: '❌ Fail', color: 'var(--danger)', bg: 'var(--danger-glow)' }, pending: { label: '⏳ Pending', color: 'var(--warning)', bg: 'hsla(38,92%,58%,.15)' }, conditional: { label: '⚠️ Conditional', color: 'var(--secondary)', bg: 'hsla(280,70%,60%,.15)' } };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">✅ Quality Management</h1>
          <p className="page-subtitle">{total} inspection records</p>
        </div>
        <div className="page-actions">
          {canManage() && <button className="btn btn-primary" onClick={() => setModal(true)} id="new-inspection-btn">+ New Inspection</button>}
        </div>
      </div>

      {/* Stats */}
      <div className="kpi-grid" style={{ marginBottom: 'var(--space-5)' }}>
        {['pass', 'fail', 'pending', 'conditional'].map((r) => {
          const count = inspections.filter(i => i.result === r).length;
          const cfg = RESULT_CONFIG[r];
          return (
            <div key={r} className="card" style={{ cursor: 'pointer', borderColor: resultFilter === r ? cfg.color : 'var(--border)' }} onClick={() => setResultFilter(resultFilter === r ? '' : r)}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{cfg.label.split(' ')[0]}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: cfg.color }}>{count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{r} inspections</div>
            </div>
          );
        })}
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <span className="card-title">Inspection Records</span>
          <div className="table-toolbar-right">
            <select className="form-select" style={{ maxWidth: 160 }} value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} id="quality-filter">
              <option value="">All Results</option>
              {RESULTS.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" onClick={load}>↻</button>
          </div>
        </div>
        <table>
          <thead><tr><th>Inspection #</th><th>Material</th><th>Inspector</th><th>Result</th><th>Qty Inspected</th><th>Pass / Fail</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? [...Array(5)].map((_, i) => <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: 16 }} /></td></tr>) :
              inspections.map((i) => {
                const cfg = RESULT_CONFIG[i.result] || RESULT_CONFIG.pending;
                return (
                  <tr key={i.id}>
                    <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{i.inspection_number}</code></td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{i.material_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i.mat_id}</div>
                    </td>
                    <td>{i.inspector_name || '—'}</td>
                    <td><span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span></td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{i.quantity_inspected || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      <span style={{ color: 'var(--accent)' }}>✓{i.quantity_passed || 0}</span> / <span style={{ color: 'var(--danger)' }}>✗{i.quantity_failed || 0}</span>
                    </td>
                    <td>{i.inspected_at ? format(new Date(i.inspected_at), 'dd MMM yyyy') : <span style={{ color: 'var(--text-muted)' }}>Pending</span>}</td>
                    <td>
                      {canManage() && i.result === 'pending' && (
                        <button className="btn btn-primary btn-sm" onClick={() => setUpdateModal(i)} id={`update-insp-${i.id}`}>Update Result</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            {!loading && inspections.length === 0 && <tr><td colSpan={8} className="table-empty"><div className="table-empty-icon">🔬</div><div className="table-empty-text">No inspections</div></td></tr>}
          </tbody>
        </table>
      </div>

      {modal && <InspectionModal materials={materials} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {updateModal && <ResultUpdateModal inspection={updateModal} onClose={() => setUpdateModal(null)} onSaved={() => { setUpdateModal(null); load(); }} />}
    </div>
  );
}
