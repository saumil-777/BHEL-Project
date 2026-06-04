import { useState, useEffect, useCallback } from 'react';
import { notificationsService } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  low_stock: { icon: '⚠️', color: 'var(--warning)' },
  inspection_failed: { icon: '❌', color: 'var(--danger)' },
  inspection_pending: { icon: '🔬', color: 'var(--secondary)' },
  po_received: { icon: '📦', color: 'var(--accent)' },
  approval_done: { icon: '✅', color: 'var(--accent)' },
  material_received: { icon: '🚚', color: 'var(--info)' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsService.getAll();
      setNotifications(data.data || []);
      setUnread(data.unread || 0);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await notificationsService.markRead(id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    await notificationsService.markAllRead();
    setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    setUnread(0);
    toast.success('All notifications marked as read');
  };

  const unreadList = notifications.filter(n => !n.is_read);
  const readList = notifications.filter(n => n.is_read);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🔔 Notifications</h1>
          <p className="page-subtitle">{unread} unread · {notifications.length} total</p>
        </div>
        <div className="page-actions">
          {unread > 0 && <button className="btn btn-secondary" onClick={markAllRead} id="mark-all-read-btn">✓ Mark All Read</button>}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72 }} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
          <div style={{ fontSize: 64, marginBottom: 'var(--space-4)' }}>🔔</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>No notifications</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>You're all caught up!</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {unreadList.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-3)' }}>Unread ({unreadList.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {unreadList.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || { icon: '🔔', color: 'var(--primary-light)' };
                  return (
                    <div key={n.id} className="card"
                      style={{ padding: 'var(--space-4)', cursor: 'pointer', border: `1px solid ${cfg.color}44`, background: `${cfg.color}08` }}
                      onClick={() => markRead(n.id)}
                      id={`notif-${n.id}`}
                    >
                      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${cfg.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{cfg.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{n.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8 }}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{n.body}</div>
                        </div>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0, marginTop: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {readList.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 'var(--space-3)' }}>Read ({readList.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {readList.map((n) => {
                  const cfg = TYPE_CONFIG[n.type] || { icon: '🔔', color: 'var(--text-muted)' };
                  return (
                    <div key={n.id} className="card" style={{ padding: 'var(--space-4)', opacity: 0.7 }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{cfg.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{n.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{n.body}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
