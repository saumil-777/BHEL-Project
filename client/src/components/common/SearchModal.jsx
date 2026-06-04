import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchService } from '../../services/api';

const TYPE_COLORS = {
  material: 'badge-primary',
  vendor: 'badge-success',
  purchase_order: 'badge-warning',
};

const TYPE_ROUTES = {
  material: '/materials',
  vendor: '/vendors',
  purchase_order: '/purchase-orders',
};

export default function SearchModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await searchService.search(query);
        setResults(data.results || []);
      } catch {}
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (result) => {
    navigate(`${TYPE_ROUTES[result.type]}/${result.id}`);
    onClose();
  };

  return (
    <div className="search-modal">
      <div className="search-backdrop" onClick={onClose} />
      <div className="search-box">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search materials, vendors, SKUs, POs…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            id="global-search-input"
          />
          {loading && <div className="spinner" />}
          <kbd style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '2px 6px' }}>ESC</kbd>
        </div>

        <div className="search-results">
          {results.length === 0 && query.length >= 2 && !loading && (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No results for "<strong>{query}</strong>"
            </div>
          )}
          {results.length === 0 && query.length < 2 && (
            <div style={{ padding: 'var(--space-6) var(--space-5)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 'var(--space-3)', fontWeight: 600 }}>Quick Actions</div>
              {[
                { icon: '📦', label: 'Browse Materials', path: '/materials' },
                { icon: '🏭', label: 'Browse Vendors', path: '/vendors' },
                { icon: '🧾', label: 'Purchase Orders', path: '/purchase-orders' },
                { icon: '📊', label: 'Dashboard', path: '/' },
              ].map(a => (
                <div key={a.path} className="search-result-item" onClick={() => { navigate(a.path); onClose(); }}>
                  <span style={{ fontSize: 20 }}>{a.icon}</span>
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>{a.label}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>→</span>
                </div>
              ))}
            </div>
          )}
          {results.map((r) => (
            <div key={`${r.type}-${r.id}`} className="search-result-item" onClick={() => handleSelect(r)}>
              <span className={`badge ${TYPE_COLORS[r.type] || 'badge-neutral'} search-result-type`}>{r.type.replace('_', ' ')}</span>
              <div className="search-result-info">
                <div className="search-result-title">{r.title}</div>
                <div className="search-result-sub">{r.subtitle}</div>
              </div>
              {r.status && <span className="badge badge-neutral" style={{ fontSize: 10 }}>{r.status}</span>}
            </div>
          ))}
        </div>

        <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--border)', display: 'flex', gap: 'var(--space-4)', fontSize: 11, color: 'var(--text-muted)' }}>
          <span>↵ to select</span>
          <span>↑↓ navigate</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
