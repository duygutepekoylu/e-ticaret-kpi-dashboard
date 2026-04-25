import { useEffect, useState, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import FilterPanel from '../../components/filters/FilterPanel';
import HeatmapChart from '../../components/charts/HeatmapChart';
import DataTable from '../../components/tables/DataTable';
import { useFilters } from '../../hooks/useFilters';
import { exportData } from '../../services/api';
import { formatNumber, formatPercent, formatCurrency } from '../../utils/format';

const columns = [
  { key: 'cohort_month',   label: 'Kohort Ayı' },
  { key: 'total_customers', label: 'Toplam Müşteri', align: 'right', render: v => formatNumber(Number(v)) },
  { key: 'offset_month',   label: 'Ay Farkı',      align: 'right', render: v => `+${v}` },
  { key: 'active_customers', label: 'Aktif Müşteri', align: 'right', render: v => formatNumber(Number(v)) },
  {
    key: 'retention_rate',
    label: 'Retention',
    align: 'right',
    render: v => {
      const r = Number(v);
      return r > 0 ? formatPercent(Math.min(r, 1)) : '—';
    },
  },
  { key: 'revenue',        label: 'Gelir',          align: 'right', render: v => formatCurrency(Number(v)) },
];

export default function Cohort() {
  const { apiParams } = useFilters();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await exportData('agg_cohort_retention', apiParams);
      const rows = res.data.data.rows ?? [];
      // Sadece gerçek kohort verisi olan satırları göster
      const valid = rows.filter(r => Number(r.total_customers) > 0);
      setPoints(valid);
    } catch (_) {}
    setLoading(false);
  }, [apiParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Heatmap için offset_month=0 satırları da dahil (retention_rate=1.0 tanım gereği)
  const heatmapPoints = points.map(r => ({
    cohort_month:    r.cohort_month,
    offset_month:    Number(r.offset_month),
    retention_rate:  Number(r.retention_rate),
    active_customers: Number(r.active_customers),
    revenue:         Number(r.revenue),
  }));

  // Kohort özet kartları — offset_month=0 olan satırlar (her kohorton ilk ayı)
  const cohortSummary = points.filter(r => Number(r.offset_month) === 0);

  return (
    <PageWrapper title="Müşteri Sadakati" subtitle="Kohort bazlı retention ve gelir analizi">
      <div style={{ marginBottom: 28 }}><FilterPanel /></div>

      <div style={{ marginBottom: 24 }}>
        <HeatmapChart
          title="Retention Heatmap — Kohort × Ay"
          points={heatmapPoints}
          height={Math.max(200, cohortSummary.length * 44 + 60)}
          loading={loading}
        />
      </div>

      <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} style={{ height: 72, borderRadius: 10, background: 'var(--color-border-light)' }} />
          ))
        ) : cohortSummary.map(r => (
          <div key={r.cohort_month} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{r.cohort_month}</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>{formatNumber(Number(r.total_customers))}</p>
            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>yeni müşteri</p>
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={points}
        loading={loading}
        pageSize={20}
        emptyText="Kohort verisi bulunamadı"
      />
    </PageWrapper>
  );
}
