import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)', flexDirection: 'column', textAlign: 'center', gap: 'var(--space-4)' }}>
      <div style={{ fontSize: 80 }}>🗂️</div>
      <h1 style={{ fontSize: 48, fontWeight: 900, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>404</h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>The page you're looking for doesn't exist.</p>
      <button className="btn btn-primary btn-lg" onClick={() => navigate('/')} id="go-home-btn">← Go to Dashboard</button>
    </div>
  );
}
