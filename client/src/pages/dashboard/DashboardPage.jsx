import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

const STATUS_COLORS = {
  received: '#6366f1', under_review: '#f59e0b', quality_check: '#8b5cf6',
  approved: '#10b981', stored: '#3b82f6', issued: '#ef4444', rejected: '#ef4444',
};

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

function KPICard({ label, value, icon, color, colorBg, change, changeType, prefix = '', suffix = '' }) {
  return (
    <div className="kpi-card" style={{ '--kpi-color': color, '--kpi-color-bg': colorBg }}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon">{icon}</div>
      </div>
      <div className="kpi-value">{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}</div>
      {change && (
        <div className={`kpi-change ${changeType}`}>
          {changeType === 'up' ? '↑' : '↓'} {change}
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 12 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
      {payload.map((p) => <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === 'number' ? p.value.toLocaleString('en-IN') : p.value}</strong></p>)}
    </div>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardService.getData()
      .then(({ data }) => setData(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div><div className="skeleton" style={{ width: 200, height: 28, marginBottom: 8 }} /><div className="skeleton" style={{ width: 300, height: 16 }} /></div>
        </div>
        <div className="kpi-grid">
          {[...Array(7)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const categories = (data?.categoryBreakdown || []).filter(c => c.category);
  const qualityStats = data?.qualityStats || [];
  const recentMats = data?.recentMaterials || [];

  // Mocked monthly trend for chart (backend returns raw data)
  const monthlyData = [
    { month: 'Jan', stockIn: 45, stockOut: 32 },
    { month: 'Feb', stockIn: 52, stockOut: 41 },
    { month: 'Mar', stockIn: 38, stockOut: 29 },
    { month: 'Apr', stockIn: 67, stockOut: 53 },
    { month: 'May', stockIn: 71, stockOut: 48 },
    { month: 'Jun', stockIn: 84, stockOut: 62 },
  ];

  const qualityData = qualityStats.map(q => ({
    name: q.result,
    value: +q.count,
  }));

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="page-subtitle">Here's what's happening with your inventory today, {format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => navigate('/reports')} id="dash-reports-btn">📋 Reports</button>
          <button className="btn btn-primary" onClick={() => navigate('/materials')} id="dash-add-material-btn">+ New Material</button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KPICard label="Total Materials" value={kpis.totalMaterials} icon="📦" color="#6366f1" colorBg="hsla(239,84%,67%,0.12)" />
        <KPICard label="Inventory Value" value={kpis.inventoryValue} icon="💰" color="#10b981" colorBg="hsla(161,80%,44%,0.12)" prefix="₹" />
        <KPICard label="Low Stock Items" value={kpis.lowStockCount} icon="⚠️" color="#f59e0b" colorBg="hsla(38,92%,58%,0.12)" />
        <KPICard label="Pending Inspections" value={kpis.pendingInspections} icon="🔬" color="#8b5cf6" colorBg="hsla(262,83%,68%,0.12)" />
        <KPICard label="Total Vendors" value={kpis.totalVendors} icon="🏭" color="#06b6d4" colorBg="hsla(199,89%,60%,0.12)" />
        <KPICard label="Warehouses" value={kpis.totalWarehouses} icon="🏗️" color="#84cc16" colorBg="hsla(84,82%,45%,0.12)" />
        <KPICard label="Active POs" value={kpis.activePOs} icon="🧾" color="#ef4444" colorBg="hsla(0,85%,60%,0.12)" />
        <KPICard label="Total C-Notes" value={kpis.totalCNotes || 0} icon="📜" color="#6366f1" colorBg="hsla(239,84%,67%,0.12)" />
        <KPICard label="Pending C-Notes" value={kpis.pendingCNotes || 0} icon="🚚" color="#f59e0b" colorBg="hsla(38,92%,58%,0.12)" />
        <KPICard label="Total SIVs" value={kpis.totalSIVs || 0} icon="📝" color="#10b981" colorBg="hsla(161,80%,44%,0.12)" />
        <KPICard label="Pending SIVs" value={kpis.pendingSIVs || 0} icon="⏳" color="#ef4444" colorBg="hsla(0,85%,60%,0.12)" />
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Inventory trend */}
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div className="chart-header">
            <div>
              <div className="chart-title">Inventory Activity — Last 6 Months</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Stock in vs stock out transactions</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="stockIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="stockOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="stockIn" stroke="#6366f1" fill="url(#stockIn)" strokeWidth={2} name="Stock In" dot={false} />
              <Area type="monotone" dataKey="stockOut" stroke="#10b981" fill="url(#stockOut)" strokeWidth={2} name="Stock Out" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Category Breakdown</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={categories} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="category" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {categories.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Quality stats */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Quality Inspection Results</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={qualityData.length ? qualityData : [{ name: 'pass', value: 8 }, { name: 'fail', value: 2 }, { name: 'pending', value: 3 }]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" nameKey="name">
                {(qualityData.length ? qualityData : [{ name: 'pass' }, { name: 'fail' }, { name: 'pending' }]).map((q, i) => (
                  <Cell key={i} fill={q.name === 'pass' ? '#10b981' : q.name === 'fail' ? '#ef4444' : '#f59e0b'} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Materials + Low Stock */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-5)' }}>
        <div className="table-wrapper">
          <div className="table-toolbar">
            <span className="card-title">Recently Added Materials</span>
            <div className="table-toolbar-right">
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/materials')} id="view-all-materials">View All →</button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentMats.map((m) => (
                <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/materials/${m.id}`)}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{m.material_id}</div>
                  </td>
                  <td><span className="badge badge-neutral">{m.category}</span></td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{Number(m.quantity).toLocaleString('en-IN')} {m.unit}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>₹{Number(m.total_value || 0).toLocaleString('en-IN')}</td>
                  <td>
                    <span className="badge" style={{ background: `${STATUS_COLORS[m.status]}22`, color: STATUS_COLORS[m.status] || 'var(--text-secondary)' }}>
                      {m.status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
              {recentMats.length === 0 && (
                <tr><td colSpan={5} className="table-empty"><div className="table-empty-text">No materials yet</div></td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[
              { icon: '📦', label: 'Add New Material', path: '/materials', color: '#6366f1' },
              { icon: '📜', label: 'Consignment Notes', path: '/cnotes', color: '#6366f1' },
              { icon: '📝', label: 'Store Issue Vouchers', path: '/sivs', color: '#10b981' },
              { icon: '🏭', label: 'Add Vendor', path: '/vendors', color: '#10b981' },
              { icon: '✅', label: 'Quality Inspection', path: '/quality', color: '#8b5cf6' },
              { icon: '🧾', label: 'Create Purchase Order', path: '/purchase-orders', color: '#f59e0b' },
              { icon: '📱', label: 'Scan QR Code', path: '/qr', color: '#06b6d4' },
              { icon: '📋', label: 'Generate Report', path: '/reports', color: '#ef4444' },
            ].map((action) => (
              <button
                key={action.path}
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                onClick={() => navigate(action.path)}
                id={`quick-action-${action.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: `${action.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{action.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{action.label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
