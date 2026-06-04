import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', department: user?.department || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [tab, setTab] = useState('profile');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const { data } = await authService.updateProfile(profileForm);
      updateUser(data);
      toast.success('Profile updated successfully');
    } catch { toast.error('Profile update failed'); }
    finally { setProfileLoading(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error('Passwords do not match'); return; }
    if (passwordForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setPasswordLoading(true);
    try {
      await authService.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
      toast.success('Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) { toast.error(err.response?.data?.error || 'Password change failed'); }
    finally { setPasswordLoading(false); }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">⚙️ Settings</h1><p className="page-subtitle">Manage your profile and account preferences</p></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-5)' }}>
        {/* Profile card */}
        <div>
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, color: 'white', margin: '0 auto var(--space-4)' }}>
              {initials}
            </div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{user?.email}</div>
            <span className="badge badge-primary" style={{ marginTop: 'var(--space-2)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</span>
            {user?.department && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>📍 {user.department}</div>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 'var(--space-3)' }}>
            {[
              { id: 'profile', label: '👤 Profile', icon: '👤' },
              { id: 'security', label: '🔐 Security', icon: '🔐' },
            ].map((t) => (
              <button key={t.id} className={`nav-item${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)} id={`settings-tab-${t.id}`} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', background: 'transparent' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {tab === 'profile' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Profile Information</span></div>
              <form onSubmit={handleProfileSave} id="profile-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">Full Name</label>
                    <input className="form-input" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} id="profile-name" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6 }} />
                    <span className="form-hint">Email cannot be changed</span>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" placeholder="+91-XXXXXXXXXX" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} id="profile-phone" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <input className="form-input" placeholder="Your department" value={profileForm.department} onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })} id="profile-dept" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <input className="form-input" value={user?.role?.replace('_', ' ')} disabled style={{ opacity: 0.6, textTransform: 'capitalize' }} />
                  <span className="form-hint">Role is assigned by administrators</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={profileLoading} id="save-profile-btn">
                    {profileLoading ? <><div className="spinner" />Saving…</> : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'security' && (
            <div className="card">
              <div className="card-header"><span className="card-title">Change Password</span></div>
              <form onSubmit={handlePasswordChange} id="password-form" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div className="form-group">
                  <label className="form-label required">Current Password</label>
                  <input className="form-input" type="password" placeholder="Enter current password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} id="current-password" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label required">New Password</label>
                    <input className="form-input" type="password" placeholder="Min 6 characters" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} id="new-password" />
                  </div>
                  <div className="form-group">
                    <label className="form-label required">Confirm Password</label>
                    <input className="form-input" type="password" placeholder="Repeat new password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} id="confirm-password" />
                  </div>
                </div>
                {passwordForm.newPassword && passwordForm.confirmPassword && (
                  <div style={{ fontSize: 12, color: passwordForm.newPassword === passwordForm.confirmPassword ? 'var(--accent)' : 'var(--danger)' }}>
                    {passwordForm.newPassword === passwordForm.confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" disabled={passwordLoading} id="change-password-btn">
                    {passwordLoading ? 'Changing…' : '🔐 Change Password'}
                  </button>
                </div>
              </form>

              <div className="divider" />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 'var(--space-3)' }}>Security Info</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <div>📧 Email: <strong>{user?.email}</strong></div>
                  <div>👤 Role: <strong style={{ textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</strong></div>
                  <div>✅ Account Status: <strong style={{ color: 'var(--accent)' }}>{user?.is_active ? 'Active' : 'Inactive'}</strong></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
