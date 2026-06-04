import { useState, useEffect } from 'react';
import { reportsService, downloadBlob, vendorsService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  { id: 'materials', title: 'Materials Report', desc: 'Complete list of all materials with stock values', icon: '📦', color: '#6366f1', bg: 'var(--primary-glow)', filters: ['status', 'category'] },
  { id: 'inventory', title: 'Inventory Transactions', desc: 'All stock movements, transfers and adjustments', icon: '🗃️', color: '#10b981', bg: 'var(--accent-glow)', filters: ['type'] },
  { id: 'cnotes', title: 'C-Note Report', desc: 'Consignment notes and vehicle dispatch tracking records', icon: '📜', color: '#3b82f6', bg: 'hsla(217,91%,60%,.12)', filters: ['cnoteStatus', 'vendor', 'dateRange'] },
  { id: 'sivs', title: 'SIV Report', desc: 'Store issue vouchers and department distribution records', icon: '📝', color: '#84cc16', bg: 'hsla(84,82%,45%,.12)', filters: ['sivStatus', 'department', 'dateRange'] },
  { id: 'quality', title: 'Quality Inspection Report', desc: 'All inspections with pass/fail statistics', icon: '✅', color: '#8b5cf6', bg: 'hsla(280,70%,60%,.12)', filters: [] },
  { id: 'audit', title: 'Audit Log Report', desc: 'Complete audit trail of all system actions', icon: '🔍', color: '#f59e0b', bg: 'hsla(38,92%,58%,.12)', filters: [], adminOnly: true },
];

const FORMATS = [
  { id: 'pdf', label: '📄 PDF', ext: '.pdf', mime: 'application/pdf' },
  { id: 'excel', label: '📊 Excel', ext: '.xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  { id: 'csv', label: '📝 CSV', ext: '.csv', mime: 'text/csv' },
];

const DEPARTMENTS = ['Assembly Line 1', 'Assembly Line 2', 'Assembly Line 3', 'Fabrication Shop', 'Maintenance', 'Safety Department', 'Quality Control', 'DTG', 'Stores', 'IT'];

export default function ReportsPage() {
  const { isAdmin } = useAuth();
  const [selected, setSelected] = useState('materials');
  const [format, setFormat] = useState('pdf');
  const [filters, setFilters] = useState({});
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);

  const report = REPORT_TYPES.find(r => r.id === selected);
  const visibleReports = REPORT_TYPES.filter(r => !r.adminOnly || isAdmin());

  useEffect(() => {
    setFilters({});
    if (selected === 'cnotes') {
      vendorsService.getAll({ limit: 100 }).then(({ data }) => setVendors(data.data || [])).catch(() => {});
    }
  }, [selected]);

  const generateReport = async () => {
    setLoading(true);
    const params = { format, ...filters };
    const fmtConfig = FORMATS.find(f => f.id === format);
    try {
      let response;
      if (selected === 'materials') response = await reportsService.materials(params);
      else if (selected === 'inventory') response = await reportsService.inventory(params);
      else if (selected === 'quality') response = await reportsService.quality(params);
      else if (selected === 'audit') response = await reportsService.audit(params);
      else if (selected === 'cnotes') response = await reportsService.cnotes(params);
      else if (selected === 'sivs') response = await reportsService.sivs(params);

      const filename = `${selected}_report_${new Date().toISOString().split('T')[0]}${fmtConfig.ext}`;
      downloadBlob(response.data, filename, fmtConfig.mime);
      toast.success(`Report downloaded as ${fmtConfig.label}`);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Report generation failed');
    } finally { setLoading(false); }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📋 Reports & Export</h1>
          <p className="page-subtitle">Generate PDF, Excel, and CSV reports for all modules</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 'var(--space-5)' }}>
        {/* Report types */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
            {visibleReports.map((r) => (
              <div key={r.id}
                className="card"
                style={{ cursor: 'pointer', borderColor: selected === r.id ? r.color : 'var(--border)', background: selected === r.id ? r.bg : 'var(--surface)', transition: 'all var(--transition-fast)' }}
                onClick={() => setSelected(r.id)}
                id={`report-type-${r.id}`}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: `${r.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{r.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{r.desc}</div>
                  </div>
                </div>
                {selected === r.id && <div style={{ marginTop: 12, fontSize: 12, color: r.color, fontWeight: 600 }}>✓ Selected</div>}
              </div>
            ))}
          </div>

          {/* Preview placeholder */}
          <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 'var(--space-4)', opacity: 0.3 }}>{report?.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{report?.title}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, maxWidth: 400, margin: '8px auto 0' }}>{report?.desc}</div>
            <div style={{ marginTop: 'var(--space-4)', fontSize: 12, color: 'var(--text-muted)' }}>
              Select format and options on the right, then click Generate
            </div>
          </div>
        </div>

        {/* Options panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Export Format</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {FORMATS.map((f) => (
                <button key={f.id} type="button"
                   style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: `2px solid ${format === f.id ? 'var(--primary)' : 'var(--border)'}`, background: format === f.id ? 'var(--primary-glow)' : 'transparent', cursor: 'pointer', color: 'var(--text)', fontWeight: 600, fontSize: 14, textAlign: 'left' }}
                  onClick={() => setFormat(f.id)}
                  id={`format-${f.id}`}
                >
                  <span style={{ fontSize: 20 }}>{f.label.split(' ')[0]}</span>
                  {f.label.split(' ')[1]}
                  {format === f.id && <span style={{ marginLeft: 'auto', color: 'var(--primary-light)', fontSize: 12 }}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          {report?.filters?.length > 0 && (
            <div className="card">
              <div className="card-header"><span className="card-title">Filters</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {report.filters.includes('status') && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value })} id="report-status-filter">
                      <option value="">All Statuses</option>
                      {['received', 'under_review', 'quality_check', 'approved', 'stored', 'issued', 'rejected'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                )}
                {report.filters.includes('cnoteStatus') && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value })} id="report-cnote-status-filter">
                      <option value="">All Statuses</option>
                      {['draft', 'in_transit', 'received', 'verified', 'rejected'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                )}
                {report.filters.includes('sivStatus') && (
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={filters.status || ''} onChange={(e) => setFilters({ ...filters, status: e.target.value })} id="report-siv-status-filter">
                      <option value="">All Statuses</option>
                      {['pending', 'approved', 'issued', 'rejected', 'returned'].map(s => <option key={s} value={s} style={{ textTransform: 'capitalize' }}>{s}</option>)}
                    </select>
                  </div>
                )}
                {report.filters.includes('category') && (
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input className="form-input" placeholder="Filter by category" value={filters.category || ''} onChange={(e) => setFilters({ ...filters, category: e.target.value })} />
                  </div>
                )}
                {report.filters.includes('type') && (
                  <div className="form-group">
                    <label className="form-label">Transaction Type</label>
                    <select className="form-select" value={filters.type || ''} onChange={(e) => setFilters({ ...filters, type: e.target.value })} id="report-type-filter">
                      <option value="">All Types</option>
                      {['stock_in', 'stock_out', 'transfer', 'adjustment', 'return', 'disposal'].map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                )}
                {report.filters.includes('vendor') && (
                  <div className="form-group">
                    <label className="form-label">Vendor</label>
                    <select className="form-select" value={filters.vendor_id || ''} onChange={(e) => setFilters({ ...filters, vendor_id: e.target.value })} id="report-vendor-filter">
                      <option value="">All Vendors</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                  </div>
                )}
                {report.filters.includes('department') && (
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-select" value={filters.department || ''} onChange={(e) => setFilters({ ...filters, department: e.target.value })} id="report-dept-filter">
                      <option value="">All Departments</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
                {report.filters.includes('dateRange') && (
                  <>
                    <div className="form-group">
                      <label className="form-label">From Date</label>
                      <input className="form-input" type="date" value={filters.from_date || ''} onChange={(e) => setFilters({ ...filters, from_date: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">To Date</label>
                      <input className="form-input" type="date" value={filters.to_date || ''} onChange={(e) => setFilters({ ...filters, to_date: e.target.value })} />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={generateReport}
            disabled={loading}
            id="generate-report-btn"
          >
            {loading ? <><div className="spinner" />Generating…</> : `Generate ${FORMATS.find(f => f.id === format)?.label} Report`}
          </button>

          <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            Reports are generated on the server and downloaded to your device
          </div>
        </div>
      </div>
    </div>
  );
}
