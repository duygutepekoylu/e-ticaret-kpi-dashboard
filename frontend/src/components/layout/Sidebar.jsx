import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '⬜' },
  { path: '/channels', label: 'Kanallar', icon: '📡' },
  { path: '/campaigns', label: 'Kampanyalar', icon: '📢' },
  { path: '/traffic', label: 'Trafik', icon: '🚦' },
  { path: '/funnel', label: 'Funnel', icon: '🔻' },
  { path: '/cohort', label: 'Cohort', icon: '👥' },
  { path: '/import', label: 'Import', icon: '📥' },
  { path: '/segments', label: 'Segmentler', icon: '🎯' },
  { path: '/views', label: 'Görünümler', icon: '🗂️' },
  { path: '/export', label: 'Export', icon: '📤' },
  { path: '/logs', label: 'Loglar', icon: '📋' },
  { path: '/settings', label: 'Ayarlar', icon: '⚙️' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700,
          }}>S</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Sporthink</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>KPI Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        {navItems.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-light)' : 'transparent',
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: 14 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', borderRadius: 8,
          background: 'var(--bg-card)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: 'var(--accent)',
          }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email || 'Kullanıcı'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
          <button
            onClick={handleLogout}
            title="Çıkış Yap"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 14, padding: 2,
            }}
          >↩</button>
        </div>
      </div>
    </aside>
  );
}
