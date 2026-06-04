import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { materialsService, inventoryService, qualityService } from '../../services/api';
import { QRCodeSVG } from 'qrcode.react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  received: '#6366f1', under_review: '#f59e0b', quality_check: '#8b5cf6',
  approved: '#10b981', stored: '#3b82f6', issued: '#ef4444', rejected: '#ef4444',
};

export default function MaterialDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [showQR, setShowQR] = useState(false);

  const load = async () => {
    try {
      const { data } = await materialsService.getOne(id);
      setMaterial(data);
    } catch { toast.error('Material not found'); navigate('/materials'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 200 }} />
    </div>
  );

  if (!material) return null;

  const qrData = JSON.stringify({
    id: material.id,
    material_id: material.material_id,
    name: material.name,
    status: material.status,
    location: material.warehouse_name,
  });

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-4)', fontSize: 13, color: 'var(--text-muted)' }}>
        <span style={{ cursor: 'pointer', color: 'var(--primary-light)' }} onClick={() => navigate('/materials')}>Materials</span>
        <span>›</span>
        <span style={{ color: 'var(--text)' }}>{material.name}</span>
      </div>

      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📦</div>
          <div>
            <h1 className="page-title">{material.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 4 }}>
              <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--primary-light)', background: 'var(--primary-glow)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>{material.material_id}</code>
              {material.sku && <code style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>SKU: {material.sku}</code>}
              <span className="badge badge-dot" style={{ background: `${STATUS_COLORS[material.status] || '#888'}22`, color: STATUS_COLORS[material.status] || '#888' }}>
                {material.status?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => setShowQR(true)} id="show-qr-btn">📱 QR Code</button>
          <button className="btn btn-primary" onClick={() => navigate('/materials')} id="back-materials">← Back</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'history', 'inspections', 'transactions', 'files'].map(t => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)} id={`mat-tab-${t}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          {/* Basic Info */}
          <div className="card">
            <div className="card-header"><span className="card-title">Basic Information</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[
                ['Category', material.category],
                ['Brand', material.brand],
                ['HSN Code', material.hsn_code],
                ['Serial Number', material.serial_number],
                ['Batch Number', material.batch_number],
                ['Vendor', material.vendor_name],
                ['Created By', material.created_by_name],
                ['Created At', material.created_at ? format(new Date(material.created_at), 'dd MMM yyyy, hh:mm a') : '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{value || '—'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stock Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="card">
              <div className="card-header"><span className="card-title">Stock Information</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {[
                  { label: 'Current Qty', value: `${Number(material.quantity).toLocaleString('en-IN')} ${material.unit}`, color: +material.quantity <= +material.min_stock_level && material.min_stock_level > 0 ? 'var(--warning)' : 'var(--text)' },
                  { label: 'Unit Cost', value: `₹${Number(material.cost).toLocaleString('en-IN')}` },
                  { label: 'Total Value', value: `₹${Number(material.total_value || 0).toLocaleString('en-IN')}`, color: 'var(--accent)' },
                  { label: 'Min Stock', value: `${material.min_stock_level || 0} ${material.unit}` },
                  { label: 'Reorder At', value: `${material.reorder_level || 0} ${material.unit}` },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: color || 'var(--text)', fontFamily: 'var(--font-mono)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="card">
              <div className="card-header"><span className="card-title">Storage Location</span></div>
              {material.warehouse_name ? (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>🏗️ {material.warehouse_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Zone: <strong>{material.zone}</strong> · Rack: <strong>{material.rack}</strong> · Shelf: <strong>{material.shelf}</strong></div>
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No location assigned</div>
              )}
            </div>

            {/* Description */}
            {material.description && (
              <div className="card">
                <div className="card-header"><span className="card-title">Description</span></div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{material.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Status History</span></div>
          {material.history?.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 'var(--space-8)' }}>No history yet</div>
          ) : (
            <div className="timeline">
              {material.history?.map((h) => (
                <div key={h.id} className="timeline-item">
                  <div className="timeline-date">{h.changed_at ? format(new Date(h.changed_at), 'dd MMM yyyy, hh:mm a') : ''} · {h.changed_by_name || 'System'}</div>
                  <div className="timeline-title">
                    {h.from_status && <><span className="badge badge-neutral" style={{ fontSize: 10 }}>{h.from_status?.replace('_', ' ')}</span> → </>}
                    <span className="badge badge-dot" style={{ fontSize: 10, background: `${STATUS_COLORS[h.to_status] || '#888'}22`, color: STATUS_COLORS[h.to_status] || '#888' }}>{h.to_status?.replace('_', ' ')}</span>
                  </div>
                  {h.notes && <div className="timeline-content">{h.notes}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'inspections' && (
        <div className="table-wrapper">
          <div className="table-toolbar"><span className="card-title">Quality Inspections</span></div>
          <table>
            <thead><tr><th>Inspection #</th><th>Inspector</th><th>Result</th><th>Qty Inspected</th><th>Date</th><th>Notes</th></tr></thead>
            <tbody>
              {(material.inspections || []).map((i) => (
                <tr key={i.id}>
                  <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{i.inspection_number}</code></td>
                  <td>{i.inspector_name || '—'}</td>
                  <td>
                    <span className="badge" style={{ background: i.result === 'pass' ? 'var(--accent-glow)' : i.result === 'fail' ? 'var(--danger-glow)' : 'hsla(38,92%,58%,.15)', color: i.result === 'pass' ? 'var(--accent)' : i.result === 'fail' ? 'var(--danger)' : 'var(--warning)' }}>{i.result}</span>
                  </td>
                  <td>{i.quantity_inspected}</td>
                  <td>{i.inspected_at ? format(new Date(i.inspected_at), 'dd MMM yyyy') : '—'}</td>
                  <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.notes}</td>
                </tr>
              ))}
              {!material.inspections?.length && <tr><td colSpan={6} className="table-empty"><div className="table-empty-text">No inspections</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="table-wrapper">
          <div className="table-toolbar"><span className="card-title">Inventory Transactions</span></div>
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Quantity</th><th>Reference</th><th>Notes</th></tr></thead>
            <tbody>
              {(material.transactions || []).map((t) => (
                <tr key={t.id}>
                  <td>{t.created_at ? format(new Date(t.created_at), 'dd MMM yyyy') : '—'}</td>
                  <td><span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>{t.type?.replace('_', ' ')}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{t.quantity}</td>
                  <td>{t.reference_number || '—'}</td>
                  <td>{t.notes || '—'}</td>
                </tr>
              ))}
              {!material.transactions?.length && <tr><td colSpan={5} className="table-empty"><div className="table-empty-text">No transactions</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'files' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Attached Files</span></div>
          {(material.files || []).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)', fontSize: 13 }}>No files attached</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
              {material.files.map((f) => (
                <div key={f.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 24 }}>📄</span>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.original_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(f.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QR Modal */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="modal" style={{ maxWidth: 380, textAlign: 'center' }}>
            <div className="modal-header">
              <h2 className="modal-title">📱 QR Code</h2>
              <button className="modal-close" onClick={() => setShowQR(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
              <div style={{ background: 'white', padding: 16, borderRadius: 'var(--radius-md)' }}>
                <QRCodeSVG value={qrData} size={200} level="H" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{material.name}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{material.material_id}</div>
              </div>
              <button className="btn btn-primary" onClick={() => window.print()} id="print-qr-btn">🖨️ Print QR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
