import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { notificationsService } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export default function Topbar({ collapsed, onMenuToggle, onSearchOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const notifRef = useRef(null);
  const userRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (userRef.current && !userRef.current.contains(e.target)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const loadNotifications = async () => {
    try {
      const { data } = await notificationsService.getAll();
      setNotifs(data.data || []);
      setUnread(data.unread || 0);
    } catch {}
  };

  const handleMarkAllRead = async () => {
    await notificationsService.markAllRead();
    setUnread(0);
    setNotifs(notifs.map(n => ({ ...n, is_read: true })));
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <header className={`topbar${collapsed ? ' sidebar-collapsed' : ''}`}>
      {/* Mobile menu button */}
      <button className="topbar-btn" onClick={onMenuToggle} style={{ display: 'none' }} id="mobile-menu-btn">
        ☰
      </button>

      {/* Search bar */}
      <div className="topbar-search" onClick={onSearchOpen} role="button" id="global-search-trigger">
        <span style={{ fontSize: 16 }}>🔍</span>
        <span>Search materials, vendors, POs…</span>
        <kbd>Ctrl+K</kbd>
      </div>

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        {/* Theme toggle */}
        <button className="topbar-btn" onClick={toggleTheme} title="Toggle theme" id="theme-toggle">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* Notifications */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="topbar-btn"
            onClick={() => { setShowNotifs(!showNotifs); setShowUser(false); }}
            id="notifications-btn"
          >
            🔔
            {unread > 0 && <span className="topbar-badge">{unread > 9 ? '9+' : unread}</span>}
          </button>

          {showNotifs && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <span>Notifications {unread > 0 && <span className="badge badge-danger" style={{ fontSize: 10 }}>{unread}</span>}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleMarkAllRead}>Mark all read</button>
              </div>
              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifs.length === 0 ? (
                  <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    No notifications
                  </div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    className={`notif-item${!n.is_read ? ' unread' : ''}`}
                    onClick={async () => {
                      await notificationsService.markRead(n.id);
                      setNotifs(notifs.map(x => x.id === n.id ? { ...x, is_read: true } : x));
                      setUnread(Math.max(0, unread - 1));
                    }}
                  >
                    {!n.is_read && <div className="notif-dot" />}
                    <div style={{ flex: 1 }}>
                      <div className="notif-title">{n.title}</div>
                      <div className="notif-body">{n.body}</div>
                      <div className="notif-time">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            className="topbar-user"
            onClick={() => { setShowUser(!showUser); setShowNotifs(false); }}
            id="user-menu-btn"
          >
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role?.replace('_', ' ')}</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
          </button>

          {showUser && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 200, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', zIndex: 200 }}>
              <div style={{ padding: 'var(--space-3) var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.email}</div>
              </div>
              {[
                { label: '👤 Profile & Settings', action: () => navigate('/settings') },
                { label: '🔔 Notifications', action: () => navigate('/notifications') },
                { label: '📋 Reports', action: () => navigate('/reports') },
              ].map(item => (
                <button
                  key={item.label}
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, fontSize: 13, padding: 'var(--space-2) var(--space-4)' }}
                  onClick={() => { item.action(); setShowUser(false); }}
                >
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'flex-start', borderRadius: 0, fontSize: 13, padding: 'var(--space-2) var(--space-4)', color: 'var(--danger)' }}
                  onClick={handleLogout}
                >
                  🚪 Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
