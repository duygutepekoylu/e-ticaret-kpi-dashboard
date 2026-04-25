import { useState } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import FilterPanel from '../../components/filters/FilterPanel';
import { useFilters } from '../../hooks/useFilters';
import { exportData } from '../../services/api';

const TABLES = [
  {
    key: 'kpi_daily_traffic',
    label: 'Günlük Trafik KPI',
    desc: 'Oturum, kullanıcı, dönüşüm, hemen çıkma oranı — GA4 kaynaklı günlük veriler',
    icon: '📈',
  },
  {
    key: 'kpi_daily_ads',
    label: 'Günlük Reklam KPI',
    desc: 'Harcama, gösterim, tıklama, ROAS — Meta + Google Ads birleşik',
    icon: '📣',
  },
  {
    key: 'kpi_daily_sales',
    label: 'Günlük Satış KPI',
    desc: 'Net ciro, sipariş sayısı, yeni/geri dönen müşteri geliri',
    icon: '💰',
  },
  {
    key: 'agg_channel_performance',
    label: 'Kanal Performansı',
    desc: 'Kanal bazlı ciro, oturum, sipariş, ROAS ve dönüşüm oranı',
    icon: '🔀',
  },
  {
    key: 'agg_campaign_performance',
    label: 'Kampanya Performansı',
    desc: 'Kampanya bazlı harcama, gelir, ROAS — Meta ve Google birleşik',
    icon: '🎯',
  },
  {
    key: 'agg_product_performance',
    label: 'Ürün Performansı',
    desc: 'Görüntülenme, satın alma, gelir, satın alma oranı — ürün bazlı',
    icon: '📦',
  },
  {
    key: 'agg_cohort_retention',
    label: 'Kohort Tutma',
    desc: 'Müşteri kohort tutma oranları — ay bazlı',
    icon: '🔁',
  },
];

function DownloadButton({ tableKey, apiParams }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(null);

  const handleDownload = async () => {
    setLoading(true);
    setDone(false);
    setErr(null);
    try {
      const res = await exportData(tableKey, {
        date_from: apiParams.date_from,
        date_to: apiParams.date_to,
      });
      const rows = res.data.data?.rows ?? [];
      const json = JSON.stringify(rows, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tableKey}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (e) {
      setErr(e.response?.data?.error?.message ?? 'İndirme başarısız');
    }
    setLoading(false);
  };

  const btnStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'opacity 0.15s',
    background: done ? 'var(--color-success)' : 'var(--color-brand)',
    color: '#fff',
    opacity: loading ? 0.7 : 1,
  };

  return (
    <div>
      <button style={btnStyle} onClick={handleDownload} disabled={loading}>
        {loading ? '⏳ İndiriliyor…' : done ? '✓ İndirildi' : '↓ JSON İndir'}
      </button>
      {err && <p style={{ marginTop: 6, fontSize: 11, color: 'var(--color-danger)' }}>{err}</p>}
    </div>
  );
}

export default function Export() {
  const { apiParams } = useFilters();

  return (
    <PageWrapper
      title="Veri Dışa Aktarma"
      subtitle="KPI ve aggregation tablolarını JSON formatında indirin"
    >
      <div style={{ marginBottom: 28 }}>
        <FilterPanel />
      </div>

      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          Seçili tarih aralığı indirilen verilere uygulanır.
          Tarih filtresi olmadan tüm kayıtlar indirilir.
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {TABLES.map(t => (
          <div
            key={t.key}
            style={{
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 12,
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 24 }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                  {t.label}
                </p>
                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  {t.desc}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--color-border-light)' }}>
              <code style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                {t.key}
              </code>
              <DownloadButton tableKey={t.key} apiParams={apiParams} />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
