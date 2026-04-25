import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import logoLight from '../../assets/logo/sporthink-logo-sidebar.png';
import logoDark from '../../assets/logo/sporthink-logo-sidebar-white.png';
import logoIcon from '../../assets/logo/sporthink-icon-red.png';

const FULL_W = 220;
const ICON_W = 64;

const navItems = [
  { path: '/', label: 'Dashboard', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  )},
  { path: '/channels', label: 'Kanallar', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  )},
  { path: '/campaigns', label: 'Kampanyalar', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
  )},
  { path: '/traffic', label: 'Trafik', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
  )},
  { path: '/funnel', label: 'Dönüşüm Hunisi', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
  )},
  { path: '/cohort', label: 'Müşteri Sadakati', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )},
  { path: '/import', label: 'Import', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
  )},
  { path: '/segments', label: 'Segmentler', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  )},
  { path: '/views', label: 'Görünümler', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
  )},
  { path: '/export', label: 'Export', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
  )},
  { path: '/logs', label: 'Loglar', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  )},
  { path: '/settings', label: 'Ayarlar', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  )},
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${collapsed ? ICON_W : FULL_W}px`);
    localStorage.setItem('sidebarCollapsed', collapsed);
  }, [collapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleBtn = (
    <button
      onClick={() => setCollapsed(c => !c)}
      title={collapsed ? 'Genişlet' : 'Daralt'}
      style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '50%',
        width: 22, height: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--color-text-muted)',
        padding: 0,
        flexShrink: 0,
      }}
    >
      {collapsed
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      }
    </button>
  );

  return (
    <aside style={{
      width: collapsed ? ICON_W : FULL_W,
      minHeight: '100vh',
      background: 'var(--color-bg-sidebar)',
      borderRight: '1px solid var(--color-border)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0, left: 0, bottom: 0,
      zIndex: 100,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>
      {/* Logo + toggle */}
      <div style={{
        padding: collapsed ? '16px 0' : '18px 16px 18px 20px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: 8,
      }}>
        {collapsed
          ? <img src={logoIcon} alt="Sporthink" style={{ width: 28, height: 28, display: 'block' }} />
          : <img src={isDark ? logoDark : logoLight} alt="Sporthink" style={{ width: 136, height: 'auto', display: 'block' }} />
        }
        {!collapsed && toggleBtn}
      </div>

      {/* Collapsed toggle — icon modunda ikonun altında */}
      {collapsed && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
          {toggleBtn}
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: collapsed ? '6px 8px' : '10px 10px', overflowY: 'auto' }}>
        {navItems.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            title={collapsed ? label : undefined}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 10,
              padding: collapsed ? '9px 0' : '8px 12px',
              borderRadius: 6,
              marginBottom: 2,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--color-brand)' : 'var(--color-text-secondary)',
              background: isActive ? 'var(--color-brand-light)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            })}
          >
            <span style={{ flexShrink: 0, opacity: 0.85 }}>{icon}</span>
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div style={{ padding: collapsed ? '10px 8px' : '12px 10px', borderTop: '1px solid var(--color-border)' }}>
        {collapsed ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              title={user?.email}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--color-brand-light)',
                border: '1px solid var(--color-brand-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--color-brand)',
                cursor: 'default',
              }}
            >
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: 2 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        ) : (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', borderRadius: 6,
            background: 'var(--color-bg-page)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'var(--color-brand-light)',
              border: '1px solid var(--color-brand-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: 'var(--color-brand)',
              flexShrink: 0,
            }}>
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.email || 'Kullanıcı'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Çıkış Yap"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 14, padding: 2, lineHeight: 1 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
