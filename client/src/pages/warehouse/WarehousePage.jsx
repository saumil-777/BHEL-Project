import { useState, useEffect, useCallback } from 'react';
import { warehousesService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

function WarehouseModal({ warehouse, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', address: '', manager_name: '', manager_phone: '', zones: 'Zone-A,Zone-B,Zone-C', ...warehouse, zones: Array.isArray(warehouse?.zones) ? warehouse.zones.join(',') : '' });
  const [loading, setLoading] = useState(false);
  const f = (k) => ({ value: form[k] || '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error('Warehouse name required'); return; }
    setLoading(true);
    try {
      const data = { ...form, zones: form.zones.split(',').map(z => z.trim()).filter(Boolean) };
      if (warehouse?.id) { await warehousesService.update(warehouse.id, data); toast.success('Warehouse updated'); }
      else { await warehousesService.create(data); toast.success('Warehouse created'); }
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2 className="modal-title">{warehouse?.id ? '✏️ Edit Warehouse' : '🏗️ New Warehouse'}</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-row">
              <div className="form-group"><label className="form-label required">Warehouse Name</label><input className="form-input" placeholder="Main Warehouse" {...f('name')} id="wh-name" /></div>
              <div className="form-group"><label className="form-label">Manager Name</label><input className="form-input" placeholder="Name" {...f('manager_name')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Manager Phone</label><input className="form-input" placeholder="+91-XXXXXXXXXX" {...f('manager_phone')} /></div>
            </div>
            <div className="form-group"><label className="form-label">Address</label><textarea className="form-textarea" placeholder="Full address" {...f('address')} /></div>
            <div className="form-group">
              <label className="form-label">Storage Zones</label>
              <input className="form-input" placeholder="Zone-A,Zone-B,Zone-C" {...f('zones')} />
              <span className="form-hint">Comma-separated zone names</span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : warehouse?.id ? 'Update' : 'Create Warehouse'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LocationModal({ warehouseId, zones, onClose, onSaved }) {
  const [form, setForm] = useState({ zone: zones[0] || '', rack: 'R1', shelf: 'S1', capacity: 100, unit: 'pcs' });
  const [loading, setLoading] = useState(false);
  const f = (k) => ({ value: form[k] || '', onChange: (e) => setForm({ ...form, [k]: e.target.value }) });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await warehousesService.createLocation(warehouseId, form);
      toast.success('Location added');
      onSaved();
    } catch (err) { toast.error('Failed to add location'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header"><h2 className="modal-title">📍 Add Location</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label required">Zone</label>
                <select className="form-select" {...f('zone')}>
                  {zones.map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label required">Rack</label><input className="form-input" placeholder="R1" {...f('rack')} /></div>
              <div className="form-group"><label className="form-label">Shelf</label><input className="form-input" placeholder="S1" {...f('shelf')} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Capacity</label><input className="form-input" type="number" {...f('capacity')} /></div>
              <div className="form-group"><label className="form-label">Unit</label><select className="form-select" {...f('unit')}>{['pcs', 'kg', 'liters', 'boxes', 'tons', 'meters'].map(u => <option key={u}>{u}</option>)}</select></div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding…' : 'Add Location'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WarehousePage() {
  const { isAdmin } = useAuth();
  const [warehouses, setWarehouses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [locModal, setLocModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await warehousesService.getAll();
      setWarehouses(data || []);
      if (!selected && data.length > 0) setSelected(data[0]);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadDetail = async (wh) => {
    const { data } = await warehousesService.getOne(wh.id);
    setSelected(data);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏗️ Warehouse Management</h1>
          <p className="page-subtitle">{warehouses.length} warehouses configured</p>
        </div>
        <div className="page-actions">
          {isAdmin() && <button className="btn btn-primary" onClick={() => setModal('create')} id="add-warehouse-btn">+ New Warehouse</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--space-5)' }}>
        {/* Warehouse list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {loading ? [...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />) :
            warehouses.map((wh) => (
              <div key={wh.id}
                className="card"
                style={{ cursor: 'pointer', borderColor: selected?.id === wh.id ? 'var(--primary)' : 'var(--border)', background: selected?.id === wh.id ? 'var(--primary-glow)' : 'var(--surface)', padding: 'var(--space-4)' }}
                onClick={() => loadDetail(wh)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{wh.name}</div>
                  {isAdmin() && (
                    <button className="btn btn-ghost btn-sm btn-icon" style={{ fontSize: 12 }} onClick={(e) => { e.stopPropagation(); setModal(wh); }} id={`edit-wh-${wh.id}`}>✏️</button>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{wh.manager_name}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, fontSize: 12 }}>
                  <span>📍 {wh.location_count || 0} locations</span>
                  <span>📦 {wh.material_count || 0} items</span>
                </div>
              </div>
            ))}
          {!loading && warehouses.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
              <div style={{ fontSize: 36 }}>🏗️</div>
              <div style={{ fontSize: 13, marginTop: 8 }}>No warehouses yet</div>
            </div>
          )}
        </div>

        {/* Warehouse detail */}
        {selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Header */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>🏗️ {selected.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{selected.address}</div>
                </div>
                {isAdmin() && <button className="btn btn-primary btn-sm" onClick={() => setLocModal(true)} id="add-location-btn">+ Add Location</button>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
                {[
                  { label: 'Manager', value: selected.manager_name || '—' },
                  { label: 'Phone', value: selected.manager_phone || '—' },
                  { label: 'Zones', value: Array.isArray(selected.zones) ? selected.zones.join(', ') : '—' },
                  { label: 'Status', value: selected.is_active ? '✅ Active' : '❌ Inactive' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Locations */}
            <div className="table-wrapper">
              <div className="table-toolbar"><span className="card-title">Storage Locations</span></div>
              <table>
                <thead><tr><th>Zone</th><th>Rack</th><th>Shelf</th><th>Capacity</th><th>Unit</th></tr></thead>
                <tbody>
                  {(selected.locations || []).map((loc) => (
                    <tr key={loc.id}>
                      <td><span className="badge badge-primary">{loc.zone}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{loc.rack}</td>
                      <td>{loc.shelf}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{loc.capacity}</td>
                      <td>{loc.unit}</td>
                    </tr>
                  ))}
                  {!(selected.locations || []).length && <tr><td colSpan={5} className="table-empty"><div className="table-empty-text">No locations defined</div></td></tr>}
                </tbody>
              </table>
            </div>

            {/* Materials */}
            <div className="table-wrapper">
              <div className="table-toolbar"><span className="card-title">Materials Stored</span></div>
              <table>
                <thead><tr><th>Material ID</th><th>Name</th><th>Location</th><th>Qty</th><th>Status</th></tr></thead>
                <tbody>
                  {(selected.materials || []).slice(0, 20).map((m) => (
                    <tr key={m.id}>
                      <td><code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--primary-light)' }}>{m.material_id}</code></td>
                      <td style={{ fontWeight: 600 }}>{m.name}</td>
                      <td><span className="badge badge-neutral">{m.zone}-{m.rack}{m.shelf ? `-${m.shelf}` : ''}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(m.quantity).toLocaleString('en-IN')} {m.unit}</td>
                      <td><span className="badge badge-neutral">{m.status?.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                  {!(selected.materials || []).length && <tr><td colSpan={5} className="table-empty"><div className="table-empty-text">No materials stored</div></td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48 }}>🏗️</div>
              <div style={{ marginTop: 12 }}>Select a warehouse to view details</div>
            </div>
          </div>
        )}
      </div>

      {modal && <WarehouseModal warehouse={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {locModal && selected && <LocationModal warehouseId={selected.id} zones={Array.isArray(selected.zones) ? selected.zones : ['Zone-A']} onClose={() => setLocModal(false)} onSaved={() => { setLocModal(false); loadDetail(selected); }} />}
    </div>
  );
}
