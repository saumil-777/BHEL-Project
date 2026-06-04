import { useState, useEffect, useCallback } from 'react';
import { auditService } from '../../services/api';
import { format } from 'date-fns';

const ACTION_COLORS = {
  CREATE: 'var(--accent)', UPDATE: 'var(--warning)', DELETE: 'var(--danger)',
  LOGIN: 'var(--info)', LOGOUT: 'var(--text-muted)',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const LIMIT = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await auditService.getLogs({ page, limit: LIMIT, action: actionFilter, entity_type: entityFilter });
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch {} finally { setLoading(false); }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">🔍 Audit Logs</h1><p className="page-subtitle">{total.toLocaleString('en-IN')} audit records</p></div>
        <div className="page-actions"><button className="btn btn-secondary" onClick={load}>↻ Refresh</button></div>
      </div>

      <div className="table-wrapper">
        <div className="table-toolbar">
          <input className="form-input" style={{ maxWidth: 200 }} placeholder="Entity type…" value={entityFilter} onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }} id="audit-entity-filter" />
          <div className="table-toolbar-right">
            <select className="form-select" style={{ maxWidth: 160 }} value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }} id="audit-action-filter">
              <option value="">All Actions</option>
              {['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'].map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
        </div>
        <table>
          <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Entity</th><th>IP Address</th><th>Details</th></tr></thead>
          <tbody>
            {loading ? [...Array(8)].map((_, i) => <tr key={i}><td colSpan={6}><div className="skeleton" style={{ height: 16 }} /></td></tr>) :
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{log.timestamp ? format(new Date(log.timestamp), 'dd MMM yy, HH:mm:ss') : '—'}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{log.user_name || 'System'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{log.user_email}</div>
                  </td>
                  <td>
                    <span className="badge badge-dot" style={{ background: `${ACTION_COLORS[log.action] || 'var(--text-muted)'}22`, color: ACTION_COLORS[log.action] || 'var(--text-muted)' }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{log.entity_type?.replace('_', ' ')}</div>
                    {log.entity_id && <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{log.entity_id?.slice(0, 8)}…</div>}
                  </td>
                  <td style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{log.ip_address || '—'}</td>
                  <td style={{ fontSize: 11, maxWidth: 200 }}>
                    {log.prev_value || log.new_value ? (
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}
                        onClick={() => alert(JSON.stringify({ prev: log.prev_value, new: log.new_value }, null, 2))}
                      >View Changes</button>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            {!loading && logs.length === 0 && <tr><td colSpan={6} className="table-empty"><div className="table-empty-icon">🔍</div><div className="table-empty-text">No audit logs</div></td></tr>}
          </tbody>
        </table>
        {Math.ceil(total / LIMIT) > 1 && (
          <div className="pagination">
            <span className="pagination-info">Page {page} of {Math.ceil(total / LIMIT)} · {total.toLocaleString('en-IN')} records</span>
            <div className="pagination-controls">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              <button className="page-btn" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
