import { useEffect, useState, useCallback, useRef } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import DataTable from '../../components/tables/DataTable';
import {
  uploadImport, getImports, getImportPreview,
  commitImport, rollbackImport, getImportErrors,
} from '../../services/api';

const SOURCE_TABLES = [
  { value: 'ga4_traffic',           label: 'GA4 Trafik' },
  { value: 'ga4_item_interactions', label: 'GA4 Ürün Etkileşimleri' },
  { value: 'meta_ads',              label: 'Meta Ads' },
  { value: 'meta_ads_breakdowns',   label: 'Meta Ads Breakdown' },
  { value: 'google_ads',            label: 'Google Ads' },
  { value: 'orders',                label: 'Siparişler' },
  { value: 'order_items',           label: 'Sipariş Kalemleri' },
  { value: 'products',              label: 'Ürünler' },
  { value: 'customers',             label: 'Müşteriler' },
  { value: 'campaigns',             label: 'Kampanyalar' },
  { value: 'channel_mapping',       label: 'Kanal Eşleme' },
];

const STATUS_CONFIG = {
  pending:     { label: 'Bekliyor',      bg: 'var(--color-warning-bg)',  color: 'var(--color-warning)' },
  previewed:   { label: 'Önizlendi',     bg: 'var(--color-brand-light)', color: 'var(--color-brand)' },
  committed:   { label: 'Tamamlandı',    bg: 'var(--color-success-bg)',  color: 'var(--color-success)' },
  failed:      { label: 'Hata',          bg: 'var(--color-danger-bg)',   color: 'var(--color-danger)' },
  rolled_back: { label: 'Geri Alındı',   bg: 'var(--color-border-light)', color: 'var(--color-text-muted)' },
};

function StatusBadge({ status }) {
  const c = STATUS_CONFIG[status] ?? { label: status, bg: 'var(--color-border-light)', color: 'var(--color-text-secondary)' };
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

// ── Adım 1: Dosya yükle ──────────────────────────────────────────────────────
function UploadStep({ onUploaded }) {
  const [sourceTable, setSourceTable] = useState('ga4_traffic');
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file) { setErr('Dosya seçmelisin'); return; }
    setUploading(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('source_table', sourceTable);
      const res = await uploadImport(fd);
      onUploaded(res.data.data);
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Yükleme başarısız');
    }
    setUploading(false);
  };

  const dropZoneStyle = {
    border: `2px dashed ${dragging ? 'var(--color-brand)' : 'var(--color-border)'}`,
    borderRadius: 12,
    padding: '40px 24px',
    textAlign: 'center',
    cursor: 'pointer',
    background: dragging ? 'var(--color-brand-light)' : 'var(--color-bg-page)',
    transition: 'all 0.15s',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: 6 }}>
          Hedef Tablo
        </label>
        <select
          value={sourceTable}
          onChange={e => setSourceTable(e.target.value)}
          style={{ padding: '9px 13px', borderRadius: 8, border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-bg-page)', color: 'var(--color-text-primary)', outline: 'none', minWidth: 260 }}
        >
          {SOURCE_TABLES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div
        style={dropZoneStyle}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.json" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
        {file ? (
          <div>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📄</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{file.name}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB — değiştirmek için tıkla
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 40, marginBottom: 12 }}>⬆️</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>
              Dosyayı buraya sürükle veya tıkla
            </p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>CSV, XLSX veya JSON — max 50 MB</p>
          </div>
        )}
      </div>

      {err && <p style={{ fontSize: 13, color: 'var(--color-danger)' }}>{err}</p>}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        style={{ alignSelf: 'flex-start', padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: (!file || uploading) ? 'not-allowed' : 'pointer', opacity: (!file || uploading) ? 0.7 : 1 }}
      >
        {uploading ? '⏳ Yükleniyor…' : 'Yükle ve Devam Et →'}
      </button>
    </div>
  );
}

// ── Adım 2: Önizleme ─────────────────────────────────────────────────────────
function PreviewStep({ importRecord, onCommit, onRollback }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    getImportPreview(importRecord.importId)
      .then(r => setPreview(r.data.data))
      .catch(() => setErr('Önizleme yüklenemedi'))
      .finally(() => setLoading(false));
  }, [importRecord.importId]);

  const handleCommit = async () => {
    setCommitting(true);
    setErr('');
    try {
      const res = await commitImport(importRecord.importId);
      setResult(res.data.data);
      onCommit();
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Commit başarısız');
    }
    setCommitting(false);
  };

  const handleRollback = async () => {
    setRolling(true);
    try {
      await rollbackImport(importRecord.importId);
      onRollback();
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'Geri alma başarısız');
    }
    setRolling(false);
  };

  if (loading) {
    return <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Önizleme yükleniyor…</p>;
  }

  if (result) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: 'var(--color-success-bg)', border: '1px solid var(--color-success)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-success)', marginBottom: 12 }}>✓ Import tamamlandı</p>
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Başarılı Satır</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-success)' }}>{result.successRows ?? 0}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Hatalı Satır</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: result.errorRows > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>{result.errorRows ?? 0}</p>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 12 }}>
            KPI yeniden hesaplama arka planda başlatıldı.
          </p>
        </div>
      </div>
    );
  }

  const rows = preview?.rows ?? [];
  const columns = rows.length > 0
    ? Object.keys(rows[0]).slice(0, 8).map(k => ({ key: k, label: k, sortable: false }))
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--color-bg-page)', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <strong>Dosya:</strong> {importRecord.filename}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <strong>Hedef Tablo:</strong> {SOURCE_TABLES.find(t => t.value === importRecord.sourceTable)?.label ?? importRecord.sourceTable}
        </span>
        <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <strong>Önizleme:</strong> ilk {rows.length} satır gösteriliyor
        </span>
      </div>

      {rows.length > 0 ? (
        <DataTable columns={columns} rows={rows} pageSize={10} />
      ) : (
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Önizleme verisi boş</p>
      )}

      {err && <p style={{ fontSize: 13, color: 'var(--color-danger)' }}>{err}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleCommit}
          disabled={committing}
          style={{ padding: '10px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', background: 'var(--color-brand)', color: '#fff', cursor: committing ? 'not-allowed' : 'pointer', opacity: committing ? 0.7 : 1 }}
        >
          {committing ? '⏳ İşleniyor…' : '✓ Onayla ve DB\'ye Yaz'}
        </button>
        <button
          onClick={handleRollback}
          disabled={rolling}
          style={{ padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-danger)', cursor: rolling ? 'not-allowed' : 'pointer' }}
        >
          {rolling ? '…' : 'İptal Et'}
        </button>
      </div>
    </div>
  );
}

// ── Import geçmiş tablosu ─────────────────────────────────────────────────────
function ImportHistory({ refreshKey }) {
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [loadingErrors, setLoadingErrors] = useState({});

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getImports();
      setImports(res.data.data ?? []);
    } catch (_) {}
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch, refreshKey]);

  const toggleErrors = async (id) => {
    if (errors[id]) { setErrors(e => { const n = { ...e }; delete n[id]; return n; }); return; }
    setLoadingErrors(e => ({ ...e, [id]: true }));
    try {
      const res = await getImportErrors(id);
      setErrors(e => ({ ...e, [id]: res.data.data ?? [] }));
    } catch (_) {
      setErrors(e => ({ ...e, [id]: [] }));
    }
    setLoadingErrors(e => ({ ...e, [id]: false }));
  };

  if (loading) {
    return <div style={{ height: 120, borderRadius: 12, background: 'var(--color-border-light)' }} />;
  }

  if (imports.length === 0) {
    return (
      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '40px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Henüz import geçmişi yok</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {imports.map(imp => (
        <div key={imp.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 3 }}>{imp.filename}</p>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {SOURCE_TABLES.find(t => t.value === imp.source_table)?.label ?? imp.source_table}
                {' · '}
                {imp.created_at ? new Date(imp.created_at).toLocaleString('tr-TR') : ''}
              </p>
            </div>
            <StatusBadge status={imp.status} />
          </div>

          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 10 }}>
            {imp.total_rows != null && (
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>Toplam: <strong>{imp.total_rows}</strong></span>
            )}
            {imp.success_rows != null && (
              <span style={{ fontSize: 12, color: 'var(--color-success)' }}>Başarılı: <strong>{imp.success_rows}</strong></span>
            )}
            {imp.error_rows > 0 && (
              <span style={{ fontSize: 12, color: 'var(--color-danger)' }}>Hatalı: <strong>{imp.error_rows}</strong></span>
            )}
          </div>

          {imp.error_rows > 0 && (
            <div>
              <button
                onClick={() => toggleErrors(imp.id)}
                style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-brand)', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
              >
                {loadingErrors[imp.id] ? 'Yükleniyor…' : errors[imp.id] ? '▲ Hataları Gizle' : '▼ Hataları Göster'}
              </button>

              {errors[imp.id] && (
                <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto', background: 'var(--color-bg-page)', borderRadius: 8, padding: '10px 12px' }}>
                  {errors[imp.id].length === 0 ? (
                    <p style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Hata detayı bulunamadı</p>
                  ) : errors[imp.id].map((e, i) => (
                    <div key={i} style={{ fontSize: 11, padding: '4px 0', borderBottom: i < errors[imp.id].length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
                      <span style={{ color: 'var(--color-text-muted)', marginRight: 8 }}>Satır {e.row_number}:</span>
                      <span style={{ color: 'var(--color-danger)' }}>{e.error_message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Ana sayfa ─────────────────────────────────────────────────────────────────
export default function Import() {
  const [activeTab, setActiveTab] = useState('upload');
  const [importRecord, setImportRecord] = useState(null);
  const [historyKey, setHistoryKey] = useState(0);

  const handleUploaded = (record) => {
    setImportRecord(record);
    setActiveTab('preview');
  };

  const handleCommitted = () => {
    setHistoryKey(k => k + 1);
  };

  const handleRolledBack = () => {
    setImportRecord(null);
    setActiveTab('upload');
    setHistoryKey(k => k + 1);
  };

  const tabStyle = (key) => ({
    padding: '9px 22px',
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderBottom: activeTab === key ? '2px solid var(--color-brand)' : '2px solid transparent',
    background: 'transparent',
    color: activeTab === key ? 'var(--color-brand)' : 'var(--color-text-secondary)',
    cursor: 'pointer',
    transition: 'color 0.15s',
  });

  return (
    <PageWrapper
      title="Veri İçe Aktarma"
      subtitle="CSV, XLSX veya JSON dosyalarını veritabanına yükle"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'flex-start' }}>

        {/* Sol: Yükleme / Önizleme */}
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', padding: '0 8px' }}>
            <button style={tabStyle('upload')} onClick={() => setActiveTab('upload')}>
              1 — Dosya Yükle
            </button>
            <button
              style={{ ...tabStyle('preview'), opacity: importRecord ? 1 : 0.4, cursor: importRecord ? 'pointer' : 'not-allowed' }}
              onClick={() => importRecord && setActiveTab('preview')}
            >
              2 — Önizle & Onayla
            </button>
          </div>

          <div style={{ padding: 24 }}>
            {activeTab === 'upload' && (
              <UploadStep onUploaded={handleUploaded} />
            )}
            {activeTab === 'preview' && importRecord && (
              <PreviewStep
                importRecord={importRecord}
                onCommit={handleCommitted}
                onRollback={handleRolledBack}
              />
            )}
          </div>
        </div>

        {/* Sağ: İpuçları */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '18px 20px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
              Import Akışı
            </p>
            {[
              { n: '1', label: 'Hedef tablo seç', desc: 'Verinin hangi tabloya gideceğini belirle' },
              { n: '2', label: 'Dosyayı yükle',   desc: 'CSV, XLSX veya JSON formatı kabul edilir' },
              { n: '3', label: 'Önizle',           desc: 'İlk 10 satırı kontrol et' },
              { n: '4', label: 'Onayla',           desc: 'Tüm veri DB\'ye yazılır, KPI güncellenir' },
            ].map(s => (
              <div key={s.n} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--color-brand)', color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.n}
                </span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 2 }}>{s.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning)', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-warning)', marginBottom: 6 }}>⚠ Dikkat</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Aynı tarih aralığındaki daha önce yüklenmiş veri varsa duplicate uyarısı alırsın.
              Import onaylandıktan sonra KPI tabloları otomatik güncellenir.
            </p>
          </div>
        </div>
      </div>

      {/* Import Geçmişi */}
      <div style={{ marginTop: 32 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 14 }}>Import Geçmişi</p>
        <ImportHistory refreshKey={historyKey} />
      </div>
    </PageWrapper>
  );
}
