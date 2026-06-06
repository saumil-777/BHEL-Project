import { useState, useEffect } from 'react';
import { materialsService } from '../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import toast from 'react-hot-toast';

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedForecast, setSelectedForecast] = useState(null);
  const [modelType, setModelType] = useState('adr'); // 'adr', 'ema', 'regression'
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadForecasts();
  }, []);

  const loadForecasts = async () => {
    try {
      setLoading(true);
      const { data } = await materialsService.getForecasts();
      setForecasts(data || []);
      if (data && data.length > 0) {
        // Find the first material with history to select by default, or fallback to first
        const withHistory = data.find(f => f.has_history);
        setSelectedForecast(withHistory || data[0]);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load stock predictions');
    } finally {
      setLoading(false);
    }
  };

  const filteredForecasts = forecasts.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.material_code.toLowerCase().includes(search.toLowerCase()) ||
      (f.category && f.category.toLowerCase().includes(search.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'critical' && f.status === 'critical') ||
      (statusFilter === 'warning' && f.status === 'warning') ||
      (statusFilter === 'stable' && f.status === 'stable') ||
      (statusFilter === 'no_history' && !f.has_history);

    return matchesSearch && matchesStatus;
  });

  // Calculate totals for KPIs
  const totalMonitored = forecasts.length;
  const criticalCount = forecasts.filter(f => f.status === 'critical').length;
  const warningCount = forecasts.filter(f => f.status === 'warning').length;
  const noHistoryCount = forecasts.filter(f => !f.has_history).length;

  // Generate Stock Trajectory declining data points for the Recharts line chart
  const getTrajectoryData = () => {
    if (!selectedForecast || !selectedForecast.has_history) return [];

    const activeModel = selectedForecast.models[modelType];
    const dailyRate = activeModel.daily_rate;
    const daysRemaining = activeModel.days_remaining !== null ? activeModel.days_remaining : 90;
    const currentQty = selectedForecast.current_quantity;

    const data = [];
    const steps = 10;
    const stepDays = Math.max(1, Math.ceil(daysRemaining / steps));

    for (let i = 0; i <= steps; i++) {
      const elapsedDays = i * stepDays;
      const projectedQty = Math.max(0, currentQty - elapsedDays * dailyRate);
      
      const pDate = new Date();
      pDate.setDate(pDate.getDate() + elapsedDays);
      const dateStr = pDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      data.push({
        day: elapsedDays,
        date: dateStr,
        'Projected Stock': +projectedQty.toFixed(1),
        'Safety Level': selectedForecast.min_stock_level
      });

      if (projectedQty <= 0) break;
    }
    return data;
  };

  // Generate past 12 weeks bar data
  const getHistoryData = () => {
    if (!selectedForecast || !selectedForecast.has_history) return [];

    return selectedForecast.weekly_history.map((qty, idx) => {
      const weeksAgo = 11 - idx;
      return {
        name: weeksAgo === 0 ? 'This Week' : `${weeksAgo}w ago`,
        Issued: +qty.toFixed(1)
      };
    });
  };

  const handleSelectMaterial = (id) => {
    const found = forecasts.find(f => f.material_id === id);
    if (found) setSelectedForecast(found);
  };

  return (
    <div className="page-forecast" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Demand & Stock-Out Predictor</h1>
          <p className="page-subtitle">Uses real-time Store Issue Voucher (SIV) consumption metrics to predict depletion dates.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--kpi-color': 'var(--accent)' }}>
          <div className="kpi-header">
            <span className="kpi-label">Monitored Items</span>
            <div className="kpi-icon">📦</div>
          </div>
          <div className="kpi-value">{totalMonitored}</div>
          <div className="kpi-change">Active inventory items</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': 'var(--danger)' }}>
          <div className="kpi-header">
            <span className="kpi-label">Critical Depletion (&lt; 7 days)</span>
            <div className="kpi-icon" style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger)' }}>⚠️</div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{criticalCount}</div>
          <div className="kpi-change">Require immediate PO creation</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': 'var(--warning)' }}>
          <div className="kpi-header">
            <span className="kpi-label">Stock Warning (&lt; 30 days)</span>
            <div className="kpi-icon" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--warning)' }}>🔔</div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{warningCount}</div>
          <div className="kpi-change">Approaching reorder thresholds</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': 'var(--text-muted)' }}>
          <div className="kpi-header">
            <span className="kpi-label">Insufficient Data</span>
            <div className="kpi-icon">ℹ️</div>
          </div>
          <div className="kpi-value">{noHistoryCount}</div>
          <div className="kpi-change">No SIV issues recorded yet</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 'var(--space-6)', alignItems: 'start' }}>
        
        {/* Left Side: Materials List */}
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div className="card-header" style={{ marginBottom: 'var(--space-4)', flexDirection: 'column', alignItems: 'stretch', gap: 'var(--space-3)' }}>
            <h3 className="card-title">Inventory Forecast Summary</h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search code, name, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ fontSize: 13 }}
              />
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: 150, fontSize: 13 }}
              >
                <option value="all">All States</option>
                <option value="critical">🔴 Critical</option>
                <option value="warning">🟡 Warning</option>
                <option value="stable">🟢 Stable</option>
                <option value="no_history">⚪ No History</option>
              </select>
            </div>
          </div>

          <div style={{ maxHeight: 600, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }} />
                <span className="text-muted">Analyzing consumption models...</span>
              </div>
            ) : filteredForecasts.length === 0 ? (
              <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
                No materials match the filter.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {filteredForecasts.map(f => {
                  const isSelected = selectedForecast?.material_id === f.material_id;
                  let statusBadge = <span className="badge badge-neutral">No History</span>;
                  if (f.has_history) {
                    if (f.status === 'critical') statusBadge = <span className="badge badge-danger">Critical</span>;
                    else if (f.status === 'warning') statusBadge = <span className="badge badge-warning">Warning</span>;
                    else statusBadge = <span className="badge badge-success">Stable</span>;
                  }

                  return (
                    <div
                      key={f.material_id}
                      onClick={() => setSelectedForecast(f)}
                      style={{
                        padding: '12px 14px',
                        background: isSelected ? 'var(--accent-muted)' : 'var(--surface-2)',
                        border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      className="forecast-item"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{f.material_code}</span>
                        {statusBadge}
                      </div>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 8 }}>{f.name}</div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>Stock: <strong>{f.current_quantity} {f.unit}</strong></span>
                        {f.has_history ? (
                          <span>Depletion: <strong>{f.primary_forecast.days_remaining} days</strong></span>
                        ) : (
                          <span>No SIV usage</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Forecast Deep Dive & Chart */}
        <div>
          {selectedForecast ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              
              {/* Detail Info Panel */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                  <div>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consumable Details</span>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginTop: 2 }}>{selectedForecast.name}</h2>
                    <p className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Code: {selectedForecast.material_code} | Category: {selectedForecast.category || 'N/A'}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="text-muted" style={{ fontSize: 11 }}>Current Quantity</span>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                      {selectedForecast.current_quantity} <span style={{ fontSize: 14, fontWeight: 500 }}>{selectedForecast.unit}</span>
                    </div>
                  </div>
                </div>

                {!selectedForecast.has_history ? (
                  <div style={{ padding: 'var(--space-6) 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 32, marginBottom: 'var(--space-2)' }}>📭</div>
                    <h4 style={{ fontWeight: 600, color: 'var(--text)' }}>Insufficient Usage History</h4>
                    <p className="text-muted" style={{ fontSize: 12, maxWidth: 380, margin: '6px auto 0' }}>
                      This item has no issued Store Issue Vouchers (SIV) recorded. Once SIVs are approved and issued, consumption patterns will auto-generate predictions.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                      <div style={{ background: 'var(--surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <span className="text-muted" style={{ fontSize: 10, uppercase: true }}>EST. DAILY USAGE</span>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
                          {selectedForecast.primary_forecast.daily_rate} <span style={{ fontSize: 11, fontWeight: 500 }}>{selectedForecast.unit}/day</span>
                        </div>
                      </div>
                      <div style={{ background: 'var(--surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <span className="text-muted" style={{ fontSize: 10, uppercase: true }}>STOCK-OUT DATE</span>
                        <div style={{ fontSize: 15, fontWeight: 700, color: selectedForecast.status === 'critical' ? 'var(--danger)' : 'var(--text)', marginTop: 8 }}>
                          {selectedForecast.primary_forecast.stockout_date ? new Date(selectedForecast.primary_forecast.stockout_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never'}
                        </div>
                      </div>
                      <div style={{ background: 'var(--surface-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                        <span className="text-muted" style={{ fontSize: 10, uppercase: true }}>SUGGESTED REORDER</span>
                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--success)', marginTop: 4 }}>
                          {selectedForecast.recommended_reorder_qty} <span style={{ fontSize: 11, fontWeight: 500 }}>{selectedForecast.unit}</span>
                        </div>
                      </div>
                    </div>

                    {/* Model Switcher */}
                    <div style={{ marginBottom: 'var(--space-5)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>Select Forecasting Model:</div>
                      <div className="tabs" style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 'var(--radius-md)' }}>
                        <button
                          className={`tab-btn ${modelType === 'adr' ? 'active' : ''}`}
                          onClick={() => setModelType('adr')}
                          style={{ flex: 1, padding: '6px 12px', fontSize: 12, border: 'none', background: modelType === 'adr' ? 'var(--surface)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: modelType === 'adr' ? 'var(--text)' : 'var(--text-muted)' }}
                        >
                          Average Rate
                        </button>
                        <button
                          className={`tab-btn ${modelType === 'ema' ? 'active' : ''}`}
                          onClick={() => setModelType('ema')}
                          style={{ flex: 1, padding: '6px 12px', fontSize: 12, border: 'none', background: modelType === 'ema' ? 'var(--surface)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: modelType === 'ema' ? 'var(--text)' : 'var(--text-muted)' }}
                        >
                          EMA (Weighted)
                        </button>
                        <button
                          className={`tab-btn ${modelType === 'regression' ? 'active' : ''}`}
                          onClick={() => setModelType('regression')}
                          style={{ flex: 1, padding: '6px 12px', fontSize: 12, border: 'none', background: modelType === 'regression' ? 'var(--surface)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: modelType === 'regression' ? 'var(--text)' : 'var(--text-muted)' }}
                        >
                          Linear Regression
                        </button>
                      </div>
                    </div>

                    {/* Trajectory chart */}
                    <div style={{ height: 280, marginTop: 'var(--space-4)', position: 'relative' }}>
                      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 'var(--space-3)' }}>Stock Depletion Trajectory ({selectedForecast.models[modelType].name})</h4>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getTrajectoryData()} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="date" stroke="var(--text-muted)" style={{ fontSize: 10 }} />
                          <YAxis stroke="var(--text-muted)" style={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: 12 }} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <ReferenceLine y={selectedForecast.min_stock_level} label={{ value: 'Min Stock Level', fill: 'var(--danger)', fontSize: 10, position: 'top' }} stroke="var(--danger)" strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="Projected Stock" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
                      {/* Model details */}
                      <div style={{ background: 'var(--surface-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justify: 'center' }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Model Evaluation</h4>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                          <strong>Rate:</strong> {selectedForecast.models[modelType].daily_rate} units/day<br/>
                          <strong>Days Remaining:</strong> {selectedForecast.models[modelType].days_remaining !== null ? `${selectedForecast.models[modelType].days_remaining} days` : 'Infinite'}<br/>
                          <strong>Stock-Out date:</strong> {selectedForecast.models[modelType].stockout_date || 'Never'}<br/>
                          {modelType === 'regression' && (
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                              <strong>Trend Slope:</strong> {selectedForecast.models.regression.slope >= 0 ? '+' : ''}{selectedForecast.models.regression.slope} (Change per week)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bar History */}
                      <div style={{ height: 180 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Weekly Consumption History (Last 12 Weeks)</h4>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getHistoryData()} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: 8 }} />
                            <YAxis stroke="var(--text-muted)" style={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)', fontSize: 11 }} />
                            <Bar dataKey="Issued" fill="var(--accent-hover)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select a consumable from the left panel to review its demand forecasts.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
