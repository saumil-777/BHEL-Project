import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  {
    section: 'Overview',
    items: [
      { to: '/', icon: '📊', label: 'Dashboard', end: true },
    ]
  },
  {
    section: 'Materials',
    items: [
      { to: '/materials', icon: '📦', label: 'Materials' },
      { to: '/vendors', icon: '🏭', label: 'Vendors' },
      { to: '/purchase-orders', icon: '🧾', label: 'Purchase Orders' },
      { to: '/cnotes', icon: '📜', label: 'C-Notes' },
    ]
  },
  {
    section: 'Operations',
    items: [
      { to: '/inventory', icon: '🗃️', label: 'Inventory' },
      { to: '/warehouse', icon: '🏗️', label: 'Warehouses' },
      { to: '/quality', icon: '✅', label: 'Quality Control' },
      { to: '/movements', icon: '🔄', label: 'Movements' },
      { to: '/sivs', icon: '📝', label: 'Store Issue Vouchers' },
    ]
  },
  {
    section: 'Tracking',
    items: [
      { to: '/qr', icon: '📱', label: 'QR / Barcode' },
      { to: '/workflows', icon: '⚙️', label: 'Workflows' },
    ]
  },
  {
    section: 'Analytics',
    items: [
      { to: '/reports', icon: '📋', label: 'Reports' },
      { to: '/audit-logs', icon: '🔍', label: 'Audit Logs', roles: ['super_admin', 'org_admin'] },
    ]
  },
  {
    section: 'System',
    items: [
      { to: '/notifications', icon: '🔔', label: 'Notifications' },
      { to: '/settings', icon: '⚙️', label: 'Settings' },
      { to: '/settings/users', icon: '👥', label: 'Users', roles: ['super_admin', 'org_admin'] },
    ]
  },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const { user, hasRole } = useAuth();

  const sidebarClass = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      {mobileOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'hsla(229,22%,3%,0.6)', zIndex: 99, backdropFilter: 'blur(4px)' }}
          onClick={onMobileClose}
        />
      )}
      <nav className={sidebarClass}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <div className="sidebar-logo-text">
            <strong>SMIMP</strong>
            <span>Enterprise Platform</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          {NAV_ITEMS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.roles || (user && item.roles.includes(user.role))
            );
            if (!visibleItems.length) return null;
            return (
              <div key={section.section}>
                <div className="nav-section-label">{section.section}</div>
                {visibleItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </div>

        {/* Bottom: toggle + user pill */}
        <div className="sidebar-bottom">
          {!collapsed && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="user-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                {user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</div>
              </div>
            </div>
          )}
          <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
            {collapsed ? '→' : '←'}
          </button>
        </div>
      </nav>
    </>
  );
}
