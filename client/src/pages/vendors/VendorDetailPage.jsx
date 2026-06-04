import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { vendorsService } from '../../services/api';
import { format } from 'date-fns';

export default function VendorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('materials');

  useEffect(() => {
    vendorsService.getOne(id).then(({ data }) => setVendor(data)).catch(() => navigate('/vendors')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="skeleton" style={{ height: 400 }} />;
  if (!vendor) return null;

  const stars = '★'.repeat(Math.round(vendor.rating || 0)) + '☆'.repeat(5 - Math.round(vendor.rating || 0));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
        <span style={{ cursor: 'pointer', color: 'var(--primary-light)' }} onClick={() => navigate('/vendors')}>Vendors</span>
        <span>›</span><span>{vendor.name}</span>
      </div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🏭</div>
          <div>
            <h1 className="page-title">{vendor.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span style={{ color: 'var(--warning)', fontSize: 14 }}>{stars}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{Number(vendor.rating).toFixed(1)} / 5.0</span>
              <span className={`badge ${vendor.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{vendor.status}</span>
            </div>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/vendors')}>← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Contact Information</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[['Contact Person', vendor.contact_person], ['Email', vendor.email], ['Phone', vendor.phone], ['Address', vendor.address]].map(([l, v]) => (
              <div key={l} style={{ fontSize: 13 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>{l}</div>
                <div style={{ color: 'var(--text)', fontWeight: 500 }}>{v || '—'}</div>
              </div>
            ))}
            {vendor.notes && <div style={{ fontSize: 13 }}><div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 2 }}>Notes</div><div style={{ color: 'var(--text-secondary)' }}>{vendor.notes}</div></div>}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { label: 'Materials Supplied', value: vendor.materials?.length || 0, icon: '📦' },
              { label: 'Purchase Orders', value: vendor.purchase_orders?.length || 0, icon: '🧾' },
              { label: 'Performance Rating', value: `${Number(vendor.rating || 0).toFixed(1)}/5`, icon: '⭐' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="card" style={{ textAlign: 'center', padding: 16 }}>
                <div style={{ fontSize: 28 }}>{icon}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="tabs">
        {['materials', 'purchase_orders'].map((t) => (
          <button key={t} className={`tab-btn${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>{t === 'materials' ? 'Materials Supplied' : 'Purchase Orders'}</button>
        ))}
      </div>

      {tab === 'materials' && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Material ID</th><th>Name</th><th>Status</th><th>Quantity</th></tr></thead>
            <tbody>
              {(vendor.materials || []).map((m) => (
                <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/materials/${m.id}`)}>
                  <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{m.material_id}</code></td>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td><span className="badge badge-neutral">{m.status?.replace('_', ' ')}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{m.quantity} {m.unit}</td>
                </tr>
              ))}
              {!vendor.materials?.length && <tr><td colSpan={4} className="table-empty"><div className="table-empty-text">No materials</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'purchase_orders' && (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>PO Number</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
            <tbody>
              {(vendor.purchase_orders || []).map((po) => (
                <tr key={po.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/purchase-orders/${po.id}`)}>
                  <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{po.po_number}</code></td>
                  <td><span className="badge badge-neutral">{po.status}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>₹{Number(po.total || 0).toLocaleString('en-IN')}</td>
                  <td>{po.created_at ? format(new Date(po.created_at), 'dd MMM yyyy') : '—'}</td>
                </tr>
              ))}
              {!vendor.purchase_orders?.length && <tr><td colSpan={4} className="table-empty"><div className="table-empty-text">No purchase orders</div></td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
