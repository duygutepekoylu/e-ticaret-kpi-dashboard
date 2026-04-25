import { useEffect, useState, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import { useFilters } from '../../hooks/useFilters';
import { getViews, createView, deleteView } from '../../services/api';

function Modal({ onClose, onSave, filters }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!name.trim()) { setErr('Görünüm adı zorunlu'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: desc.trim(), filters, layout: {} });
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Kayıt başarısız');
    }
    setSaving(false);
  };

  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  };
  const box = {
    background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
    borderRadius: 14, padding: 28, width: 440, display: 'flex', flexDirection: 'column', gap: 16,
  };
  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--color-border)', fontSize: 13,
    background: 'var(--color-bg-page)', color: 'var(--color-text-primary)',
    outline: 'none', boxSizing: 'border-box',
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={box}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Görünüm Kaydet
        </h3>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
            Görünüm Adı *
          </label>
          <input
            style={inputStyle}
            placeholder="örn. Q1 2025 — Paid Social"
            value={name}
            onChange={e => { setName(e.target.value); setErr(''); }}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
            Açıklama
          </label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
            placeholder="Bu görünüm hakkında kısa not…"
            value={desc}
            onChange={e => setDesc(e.target.value)}
          />
        </div>
        <div style={{ background: 'var(--color-bg-page)', borderRadius: 8, padding: '10px 12px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            KAYDEDILECEK FİLTRELER
          </p>
          <code style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {JSON.stringify(filters, null, 2)}
          </code>
        </div>
        {err && <p style={{ fontSize: 12, color: 'var(--color-danger)' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
            onClick={onClose}
          >
            İptal
          </button>
          <button
            style={{ padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewCard({ view, onDelete, onLoad }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(view.id); } catch (_) {}
    setDeleting(false);
    setConfirming(false);
  };

  const filterEntries = Object.entries(view.filters ?? {}).filter(([, v]) => v);

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 12,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
            {view.name}
          </p>
          {view.description && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{view.description}</p>
          )}
        </div>
        {view.is_default === 1 && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: 'var(--color-brand-light)', color: 'var(--color-brand)', whiteSpace: 'nowrap' }}>
            VARSAYILAN
          </span>
        )}
      </div>

      {filterEntries.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {filterEntries.map(([k, v]) => (
            <span key={k} style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 4,
              background: 'var(--color-bg-page)', border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}>
              {k}: {String(v)}
            </span>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
          Filtre yok (tüm veriler)
        </p>
      )}

      <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
        {view.created_at ? new Date(view.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
      </p>

      <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid var(--color-border-light)' }}>
        <button
          style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: 'pointer' }}
          onClick={() => onLoad(view)}
        >
          Yükle
        </button>
        {!confirming ? (
          <button
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}
            onClick={() => setConfirming(true)}
          >
            Sil
          </button>
        ) : (
          <button
            style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', background: 'var(--color-danger)', color: '#fff', cursor: deleting ? 'not-allowed' : 'pointer' }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? '…' : 'Emin misin?'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Views() {
  const { apiParams, setFilters } = useFilters();
  const [views, setViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');

  const fetchViews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getViews();
      setViews(res.data.data?.views ?? []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchViews(); }, [fetchViews]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleSave = async (payload) => {
    await createView(payload);
    fetchViews();
    showToast('Görünüm kaydedildi');
  };

  const handleDelete = async (id) => {
    await deleteView(id);
    setViews(v => v.filter(x => x.id !== id));
    showToast('Görünüm silindi');
  };

  const handleLoad = (view) => {
    const f = view.filters ?? {};
    setFilters({
      dateFrom: f.date_from ?? '',
      dateTo:   f.date_to ?? '',
      channel:  f.channel ?? '',
      campaign: f.campaign ?? '',
      device:   f.device ?? '',
      city:     f.city ?? '',
      revenueMin: f.revenue_min ?? '',
      revenueMax: f.revenue_max ?? '',
      roasMin:  f.roas_min ?? '',
      roasMax:  f.roas_max ?? '',
    });
    showToast(`"${view.name}" yüklendi`);
  };

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: 'pointer',
  };

  return (
    <PageWrapper
      title="Kaydedilmiş Görünümler"
      subtitle="Dashboard filtre kombinasyonlarını kaydet ve tekrar yükle"
      actions={
        <button style={btnStyle} onClick={() => setShowModal(true)}>
          + Mevcut Filtreleri Kaydet
        </button>
      }
    >
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

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{ height: 180, borderRadius: 12, background: 'var(--color-border-light)' }} />
          ))}
        </div>
      ) : views.length === 0 ? (
        <div style={{
          background: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
          borderRadius: 12, padding: '64px 32px', textAlign: 'center',
        }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🔖</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>
            Henüz kaydedilmiş görünüm yok
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Dashboard'da filtreler uygula, ardından buradan kaydet
          </p>
          <button style={btnStyle} onClick={() => setShowModal(true)}>
            + Mevcut Filtreleri Kaydet
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {views.map(v => (
            <ViewCard
              key={v.id}
              view={v}
              onDelete={handleDelete}
              onLoad={handleLoad}
            />
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          filters={apiParams}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </PageWrapper>
  );
}
