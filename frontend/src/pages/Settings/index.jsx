import { useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_LABELS = { admin: 'Yönetici', marketing: 'Pazarlama Yetkilisi', viewer: 'Görüntüleyici' };

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </p>
      </div>
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, desc, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{label}</p>
        {desc && <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{desc}</p>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 12,
        border: 'none',
        background: value ? 'var(--color-brand)' : 'var(--color-border)',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        padding: 0,
      }}
    >
      <span style={{
        position: 'absolute',
        top: 3,
        left: value ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: '50%',
        background: '#fff',
        transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
      }} />
    </button>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: '7px 32px 7px 12px',
        borderRadius: 8,
        border: '1px solid var(--color-border)',
        fontSize: 13,
        background: 'var(--color-bg-page)',
        color: 'var(--color-text-primary)',
        cursor: 'pointer',
        outline: 'none',
        appearance: 'none',
        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23667085\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
      }}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function readPref(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}

export default function Settings() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [defaultRange, setDefaultRange] = useState(() => readPref('defaultRange', '30'));
  const [toast, setToast] = useState('');

  const handleDarkMode = (val) => {
    setDarkMode(val);
    if (val) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('darkMode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('darkMode', 'false');
    }
  };

  const handleSave = () => {
    localStorage.setItem('defaultRange', defaultRange);
    setToast('Tercihler kaydedildi');
    setTimeout(() => setToast(''), 2500);
  };

  const handleReset = () => {
    handleDarkMode(false);
    setDefaultRange('30');
    localStorage.setItem('defaultRange', '30');
    setToast('Varsayılanlara döndürüldü');
    setTimeout(() => setToast(''), 2500);
  };

  return (
    <PageWrapper title="Ayarlar" subtitle="Görüntüleme tercihleri ve hesap bilgileri">

      {toast && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 2000,
          background: 'var(--color-success)', color: '#fff',
          padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          ✓ {toast}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>

        <Section title="Hesap Bilgileri">
          <Row label="E-posta">
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{user?.email ?? '—'}</span>
          </Row>
          <Row label="Rol">
            <span style={{
              fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
              background: 'var(--color-brand-light)', color: 'var(--color-brand)',
            }}>
              {ROLE_LABELS[user?.role] ?? user?.role ?? '—'}
            </span>
          </Row>
          <Row label="Ad Soyad">
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{user?.name ?? '—'}</span>
          </Row>
        </Section>

        <Section title="Görünüm">
          <Row
            label="Karanlık Mod"
            desc="Düşük ışık ortamları için koyu renk teması"
          >
            <Toggle value={darkMode} onChange={handleDarkMode} />
          </Row>
        </Section>

        <Section title="Dashboard Tercihleri">
          <Row
            label="Varsayılan Tarih Aralığı"
            desc="Dashboard ilk açıldığında kaç günlük veri gösterilsin"
          >
            <Select
              value={defaultRange}
              onChange={setDefaultRange}
              options={[
                { value: '7',  label: 'Son 7 gün' },
                { value: '14', label: 'Son 14 gün' },
                { value: '30', label: 'Son 30 gün' },
                { value: '90', label: 'Son 90 gün' },
              ]}
            />
          </Row>
        </Section>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={handleReset}
            style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
          >
            Varsayılanlara Dön
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '9px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: 'pointer' }}
          >
            Kaydet
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}
