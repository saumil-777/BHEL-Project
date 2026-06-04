import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role) => {
    const creds = {
      super_admin: { email: 'superadmin@smimp.com', pass: 'Admin@123' },
      org_admin:   { email: 'admin@bhel.in',         pass: 'Admin@123' },
      inventory:   { email: 'inventory@bhel.in',      pass: 'Admin@123' },
      quality:     { email: 'quality@bhel.in',        pass: 'Admin@123' },
      warehouse:   { email: 'warehouse@bhel.in',      pass: 'Admin@123' },
    };
    const c = creds[role];
    if (c) { setEmail(c.email); setPassword(c.pass); }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg-orbs">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
      </div>

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <h1 className="auth-title">Welcome to SMIMP</h1>
          <p className="auth-subtitle">Smart Material & Inventory Management Platform</p>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label required">Email Address</label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              placeholder="you@organization.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label required">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={loading} id="login-submit" style={{ width: '100%', marginTop: 'var(--space-2)' }}>
            {loading ? <><div className="spinner" />Signing in…</> : '🔐 Sign In'}
          </button>
        </form>

        {/* Quick demo logins */}
        <div style={{ marginTop: 'var(--space-6)' }}>
          <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 'var(--space-3)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Quick Demo Access
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
            {[
              { label: 'Super Admin', role: 'super_admin' },
              { label: 'Org Admin', role: 'org_admin' },
              { label: 'Inventory Mgr', role: 'inventory' },
              { label: 'Quality Mgr', role: 'quality' },
            ].map(({ label, role }) => (
              <button
                key={role}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => quickLogin(role)}
                id={`quick-login-${role}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 'var(--space-3)', fontSize: 12, color: 'var(--text-muted)' }}>
            Default password: <code style={{ fontFamily: 'var(--font-mono)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 4 }}>Admin@123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
