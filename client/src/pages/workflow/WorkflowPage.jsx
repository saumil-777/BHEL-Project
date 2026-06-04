import { useState, useEffect, useCallback } from 'react';
import { workflowsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const DEFAULT_STAGES = [
  { id: 'received', name: 'Received', color: '#6366f1', order: 1 },
  { id: 'under_review', name: 'Under Review', color: '#f59e0b', order: 2 },
  { id: 'quality_check', name: 'Quality Check', color: '#8b5cf6', order: 3 },
  { id: 'approved', name: 'Approved', color: '#10b981', order: 4 },
  { id: 'stored', name: 'Stored', color: '#3b82f6', order: 5 },
  { id: 'issued', name: 'Issued', color: '#ef4444', order: 6 },
];

function WorkflowModal({ workflow, onClose, onSaved }) {
  const [name, setName] = useState(workflow?.name || '');
  const [stages, setStages] = useState(workflow?.stages || DEFAULT_STAGES);
  const [loading, setLoading] = useState(false);

  const addStage = () => setStages([...stages, { id: `stage_${Date.now()}`, name: 'New Stage', color: '#6366f1', order: stages.length + 1 }]);
  const removeStage = (idx) => setStages(stages.filter((_, i) => i !== idx));
  const updateStage = (idx, key, value) => { const s = [...stages]; s[idx] = { ...s[idx], [key]: value }; setStages(s); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) { toast.error('Workflow name required'); return; }
    setLoading(true);
    try {
      const data = { name, stages };
      if (workflow?.id) { await workflowsService.update(workflow.id, data); toast.success('Workflow updated'); }
      else { await workflowsService.create(data); toast.success('Workflow created'); }
      onSaved();
    } catch (err) { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header"><h2 className="modal-title">{workflow?.id ? '✏️ Edit Workflow' : '⚙️ New Workflow'}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-group"><label className="form-label required">Workflow Name</label><input className="form-input" placeholder="e.g. Standard Material Workflow" value={name} onChange={(e) => setName(e.target.value)} id="wf-name" /></div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <label className="form-label" style={{ margin: 0 }}>Stages</label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addStage} id="add-stage-btn">+ Add Stage</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {stages.map((stage, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 14, width: 20, textAlign: 'center' }}>{idx + 1}</span>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                    <input className="form-input" style={{ flex: 1 }} placeholder="Stage name" value={stage.name} onChange={(e) => updateStage(idx, 'name', e.target.value)} />
                    <input type="color" value={stage.color} onChange={(e) => updateStage(idx, 'color', e.target.value)} style={{ width: 32, height: 32, borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', padding: 2, background: 'var(--surface)' }} />
                    <button type="button" className="btn btn-ghost btn-sm btn-icon" style={{ color: 'var(--danger)' }} onClick={() => removeStage(idx)}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <div className="form-label" style={{ marginBottom: 8 }}>Preview</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                {stages.map((stage, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="badge" style={{ background: `${stage.color}22`, color: stage.color }}>{stage.name}</span>
                    {idx < stages.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 16 }}>→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : workflow?.id ? 'Update Workflow' : 'Create Workflow'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WorkflowPage() {
  const { isAdmin } = useAuth();
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await workflowsService.getAll(); setWorkflows(data || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">⚙️ Workflow Engine</h1><p className="page-subtitle">Configure material lifecycle workflows for your organization</p></div>
        <div className="page-actions">
          {isAdmin() && <button className="btn btn-primary" onClick={() => setModal('create')} id="create-workflow-btn">+ New Workflow</button>}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 200 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
          {workflows.map((wf) => (
            <div key={wf.id} className="card">
              <div className="card-header">
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{wf.name}</div>
                  {wf.is_default && <span className="badge badge-success" style={{ marginTop: 4 }}>Default</span>}
                </div>
                {isAdmin() && <button className="btn btn-ghost btn-sm" onClick={() => setModal(wf)} id={`edit-wf-${wf.id}`}>✏️ Edit</button>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                {(wf.stages || []).map((stage, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="badge" style={{ background: `${stage.color}22`, color: stage.color, fontSize: 11 }}>{stage.name}</span>
                    {idx < wf.stages.length - 1 && <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 'var(--space-3)', fontSize: 12, color: 'var(--text-muted)' }}>
                {(wf.stages || []).length} stages in this workflow
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div style={{ gridColumn: '1/-1' }} className="card">
              <div className="table-empty"><div className="table-empty-icon">⚙️</div><div className="table-empty-text">No workflows defined</div><div className="table-empty-sub">Create a workflow to define material lifecycle stages</div></div>
            </div>
          )}
        </div>
      )}

      {modal && <WorkflowModal workflow={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
