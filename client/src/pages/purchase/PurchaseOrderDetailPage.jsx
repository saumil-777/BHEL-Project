import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { purchaseOrderService } from '../../services/api';
import { format } from 'date-fns';

const STATUS_CONFIG = {
  draft: { color: 'var(--text-muted)', bg: 'var(--surface-3)' },
  sent: { color: 'var(--info)', bg: 'hsla(199,89%,60%,.15)' },
  received: { color: 'var(--accent)', bg: 'var(--accent-glow)' },
  closed: { color: 'var(--text-muted)', bg: 'var(--surface-2)' },
  cancelled: { color: 'var(--danger)', bg: 'var(--danger-glow)' },
};

export default function PurchaseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    purchaseOrderService.getOne(id).then(({ data }) => setPO(data)).catch(() => navigate('/purchase-orders')).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="skeleton" style={{ height: 500 }} />;
  if (!po) return null;

  const cfg = STATUS_CONFIG[po.status] || STATUS_CONFIG.draft;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>
        <span style={{ cursor: 'pointer', color: 'var(--primary-light)' }} onClick={() => navigate('/purchase-orders')}>Purchase Orders</span>
        <span>›</span><span>{po.po_number}</span>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">🧾 {po.po_number}</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <span className="badge" style={{ background: cfg.bg, color: cfg.color, textTransform: 'capitalize' }}>{po.status}</span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{po.vendor_name}</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/purchase-orders')}>← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Order Details</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Vendor', po.vendor_name], ['Contact', po.vendor_email], ['Phone', po.vendor_phone],
              ['Order Date', po.order_date ? format(new Date(po.order_date), 'dd MMM yyyy') : '—'],
              ['Expected Delivery', po.expected_delivery ? format(new Date(po.expected_delivery), 'dd MMM yyyy') : '—'],
              ['Created By', po.created_by_name],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontWeight: 600 }}>{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Financial Summary</span></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Subtotal', `₹${Number(po.subtotal || 0).toLocaleString('en-IN')}`],
              ['Tax', `₹${Number(po.tax || 0).toLocaleString('en-IN')}`],
              ['Discount', `−₹${Number(po.discount || 0).toLocaleString('en-IN')}`],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 800, paddingTop: 4 }}>
              <span>Total</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>₹{Number(po.total || 0).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="table-wrapper">
        <div className="table-toolbar"><span className="card-title">Line Items</span></div>
        <table>
          <thead><tr><th>#</th><th>Description</th><th>Material</th><th>Qty</th><th>Unit</th><th>Unit Price</th><th>Total</th><th>Received</th></tr></thead>
          <tbody>
            {(po.items || []).map((item, i) => (
              <tr key={item.id}>
                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{item.description}</td>
                <td style={{ fontSize: 12 }}>{item.material_name || '—'}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{item.quantity}</td>
                <td>{item.unit}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(item.unit_price || 0).toLocaleString('en-IN')}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)' }}>₹{Number(item.total || 0).toLocaleString('en-IN')}</td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>
                  <span style={{ color: item.received_qty >= item.quantity ? 'var(--accent)' : 'var(--warning)' }}>
                    {item.received_qty || 0} / {item.quantity}
                  </span>
                </td>
              </tr>
            ))}
            {!po.items?.length && <tr><td colSpan={8} className="table-empty"><div className="table-empty-text">No line items</div></td></tr>}
          </tbody>
        </table>
      </div>

      {po.notes && (
        <div className="card" style={{ marginTop: 'var(--space-5)' }}>
          <div className="card-header"><span className="card-title">Notes</span></div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{po.notes}</p>
        </div>
      )}
    </div>
  );
}
