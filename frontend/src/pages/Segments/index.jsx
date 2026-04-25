import { useEffect, useState, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import {
  getSegments, createSegment, deleteSegment, previewSegment,
  getChannels, getCampaigns, getCities,
} from '../../services/api';
import { formatNumber } from '../../utils/format';

const inputStyle = {
  width: '100%',
  padding: '9px 13px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  fontSize: 13,
  background: 'var(--color-bg-page)',
  color: 'var(--color-text-primary)',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle = { ...inputStyle, cursor: 'pointer', appearance: 'none' };

function FieldLabel({ children, required }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
      {children} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}
    </label>
  );
}

function CreateModal({ onClose, onSave, channels, campaigns, cities }) {
  const [form, setForm] = useState({ name: '', description: '', channel: '', campaign: '', city: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErr(''); };

  const handleSave = async () => {
    if (!form.name.trim()) { setErr('Segment adı zorunlu'); return; }
    const rules = {};
    if (form.channel)  rules.channel  = form.channel;
    if (form.campaign) rules.campaign = form.campaign;
    if (form.city)     rules.city     = form.city;
    setSaving(true);
    try {
      await onSave({ name: form.name.trim(), description: form.description.trim() || null, rules });
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Kayıt başarısız');
    }
    setSaving(false);
  };

  const hasRule = form.channel || form.campaign || form.city;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 14, padding: 28, width: 480, display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>
          Yeni Segment Oluştur
        </h3>

        <div>
          <FieldLabel required>Segment Adı</FieldLabel>
          <input style={inputStyle} placeholder="örn. İstanbul — Paid Social" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>

        <div>
          <FieldLabel>Açıklama</FieldLabel>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} placeholder="Kısa açıklama…" value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div style={{ borderTop: '1px solid var(--color-border-light)', paddingTop: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            Filtre Kuralları
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <FieldLabel>Kanal</FieldLabel>
              <select style={selectStyle} value={form.channel} onChange={e => set('channel', e.target.value)}>
                <option value="">— Tümü —</option>
                {channels.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Kampanya</FieldLabel>
              <select style={selectStyle} value={form.campaign} onChange={e => set('campaign', e.target.value)}>
                <option value="">— Tümü —</option>
                {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Şehir</FieldLabel>
              <select style={selectStyle} value={form.city} onChange={e => set('city', e.target.value)}>
                <option value="">— Tümü —</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {!hasRule && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 10, fontStyle: 'italic' }}>
              En az bir filtre seçilirse segment anlamlı olur; boş bırakılırsa tüm veriler eşleşir.
            </p>
          )}
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
            {saving ? 'Kaydediliyor…' : 'Oluştur'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({ segmentId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    previewSegment(segmentId)
      .then(r => setData(r.data.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [segmentId]);

  return (
    <div style={{ marginTop: 12, background: 'var(--color-bg-page)', borderRadius: 8, padding: '14px 16px', border: '1px solid var(--color-border-light)' }}>
      {loading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Hesaplanıyor…</p>
      ) : data ? (
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Eşleşen Sipariş</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-brand)' }}>{formatNumber(data.matching_orders)}</p>
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Eşleşen Müşteri</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)' }}>{formatNumber(data.matching_customers)}</p>
          </div>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, fontSize: 12, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', cursor: 'pointer' }}
          >
            Kapat
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--color-danger)' }}>Önizleme yüklenemedi</p>
      )}
    </div>
  );
}

function SegmentCard({ segment, onDelete, onPreview, previewOpen }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try { await onDelete(segment.id); } catch (_) {}
    setDeleting(false);
  };

  const rules = typeof segment.rules === 'string' ? JSON.parse(segment.rules) : (segment.rules ?? {});
  const ruleEntries = Object.entries(rules).filter(([, v]) => v);

  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{segment.name}</p>
          {segment.description && (
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{segment.description}</p>
          )}
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          {segment.created_at ? new Date(segment.created_at).toLocaleDateString('tr-TR') : ''}
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {ruleEntries.length > 0 ? ruleEntries.map(([k, v]) => (
          <span key={k} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--color-bg-page)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            {k}: {v}
          </span>
        )) : (
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Kural yok — tüm veriler</span>
        )}
      </div>

      {previewOpen && <PreviewPanel segmentId={segment.id} onClose={() => onPreview(null)} />}

      <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--color-border-light)' }}>
        <button
          style={{ flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid var(--color-border)', background: 'transparent', color: previewOpen ? 'var(--color-brand)' : 'var(--color-text-secondary)', cursor: 'pointer' }}
          onClick={() => onPreview(previewOpen ? null : segment.id)}
        >
          {previewOpen ? 'Önizleme Kapat' : 'Önizle'}
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

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [channels, setChannels] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [cities, setCities] = useState([]);

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSegments();
      setSegments(res.data.data?.segments ?? []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSegments();
    getChannels().then(r => setChannels(r.data.data?.channels ?? [])).catch(() => {});
    getCampaigns().then(r => setCampaigns((r.data.data?.campaigns ?? []).map(x => x.campaign_name).filter(Boolean))).catch(() => {});
    getCities().then(r => setCities(r.data.data?.cities ?? [])).catch(() => {});
  }, [fetchSegments]);

  const handleSave = async (payload) => {
    await createSegment(payload);
    fetchSegments();
  };

  const handleDelete = async (id) => {
    await deleteSegment(id);
    setSegments(s => s.filter(x => x.id !== id));
    if (previewId === id) setPreviewId(null);
  };

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: 'pointer',
  };

  return (
    <PageWrapper
      title="Segmentler"
      subtitle="Kanal, kampanya ve şehir bazlı müşteri segmentleri oluştur"
      actions={<button style={btnStyle} onClick={() => setShowModal(true)}>+ Yeni Segment</button>}
    >
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {[...Array(3)].map((_, i) => <div key={i} style={{ height: 160, borderRadius: 12, background: 'var(--color-border-light)' }} />)}
        </div>
      ) : segments.length === 0 ? (
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '64px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🏷️</p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Henüz segment yok</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Kanal, kampanya veya şehre göre müşteri grupları oluştur
          </p>
          <button style={btnStyle} onClick={() => setShowModal(true)}>+ Yeni Segment</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {segments.map(s => (
            <SegmentCard
              key={s.id}
              segment={s}
              onDelete={handleDelete}
              onPreview={setPreviewId}
              previewOpen={previewId === s.id}
            />
          ))}
        </div>
      )}

      {showModal && (
        <CreateModal
          onClose={() => setShowModal(false)}
          onSave={handleSave}
          channels={channels}
          campaigns={campaigns}
          cities={cities}
        />
      )}
    </PageWrapper>
  );
}
