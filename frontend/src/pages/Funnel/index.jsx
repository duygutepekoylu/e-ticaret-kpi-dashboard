import { useEffect, useState, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import FilterPanel from '../../components/filters/FilterPanel';
import FunnelChart from '../../components/charts/FunnelChart';
import DataTable from '../../components/tables/DataTable';
import { useFilters } from '../../hooks/useFilters';
import { getFunnel } from '../../services/api';
import { formatNumber, formatPercent } from '../../utils/format';

const STEP_LABELS = {
  session_start:  'Oturum Başlangıcı',
  view_item:      'Ürün Görüntüleme',
  add_to_cart:    'Sepete Ekle',
  begin_checkout: 'Ödeme Başlat',
  purchase:       'Satın Alma',
  conversion:     'Dönüşüm (GA4)',
};

const columns = [
  { key: 'name',  label: 'Adım',    render: v => STEP_LABELS[v] ?? v },
  { key: 'value', label: 'Kullanıcı', align: 'right', render: v => formatNumber(Number(v)) },
  {
    key: 'rate',
    label: 'Önceki Adıma Göre',
    align: 'right',
    render: (v, row) => {
      if (row.name === 'session_start') return '—';
      if (v == null) return '—';
      return formatPercent(Number(v));
    },
  },
];

export default function Funnel() {
  const { apiParams } = useFilters();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getFunnel(apiParams);
      setSteps(res.data.data.funnel ?? []);
    } catch (_) {}
    setLoading(false);
  }, [apiParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <PageWrapper title="Dönüşüm Hunisi" subtitle="Oturum başlangıcından satın almaya adım adım dönüşüm analizi">
      <div style={{ marginBottom: 28 }}><FilterPanel /></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, alignItems: 'start' }}>
        <FunnelChart
          title="Satın Alma Hunisi"
          steps={steps}
          height={360}
          loading={loading}
        />

        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>Adım Detayları</p>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: 40, borderRadius: 6, background: 'var(--color-border-light)' }} />
              ))}
            </div>
          ) : steps.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Veri bulunamadı</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.map((s, i) => {
                const pct = i === 0 ? 1 : s.rate ?? 0;
                const isConversion = s.name === 'conversion';
                return (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--color-border-light)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', width: 18, textAlign: 'right' }}>{i + 1}</span>
                      <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>{STEP_LABELS[s.name] ?? s.name}</span>
                      {isConversion && (
                        <span style={{ fontSize: 10, color: 'var(--color-warning)', background: 'var(--color-warning-bg)', borderRadius: 4, padding: '2px 6px' }}>GA4 tüm dönüşümler</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, textAlign: 'right' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{formatNumber(s.value)}</span>
                      {i > 0 && (
                        <span style={{ fontSize: 12, color: pct >= 0.3 ? 'var(--color-success)' : pct >= 0.1 ? 'var(--color-warning)' : 'var(--color-danger)', minWidth: 46 }}>
                          {s.rate != null ? formatPercent(s.rate) : '—'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={steps}
        loading={loading}
        emptyText="Huni verisi bulunamadı"
      />
    </PageWrapper>
  );
}
