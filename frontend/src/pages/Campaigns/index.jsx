import { useEffect, useState, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import FilterPanel from '../../components/filters/FilterPanel';
import KpiCard from '../../components/kpi/KpiCard';
import KpiGrid from '../../components/kpi/KpiGrid';
import BarChart from '../../components/charts/BarChart';
import ScatterChart from '../../components/charts/ScatterChart';
import DataTable from '../../components/tables/DataTable';
import { useFilters } from '../../hooks/useFilters';
import { getCampaignPerformance, getPlatformPerformance } from '../../services/api';
import { formatCurrency, formatNumber, formatPercent, formatRoas } from '../../utils/format';

const campaignColumns = [
  { key: 'campaign_name', label: 'Kampanya' },
  { key: 'platform',      label: 'Platform',  render: v => v === 'meta' ? 'Meta' : 'Google' },
  { key: 'spend',         label: 'Harcama',   align: 'right', render: v => formatCurrency(Number(v)) },
  { key: 'revenue',       label: 'Ciro',      align: 'right', render: v => formatCurrency(Number(v)) },
  { key: 'roas',          label: 'ROAS',      align: 'right', render: v => formatRoas(Number(v)) },
  { key: 'impressions',   label: 'Gösterim',  align: 'right', render: v => formatNumber(Number(v)) },
  { key: 'clicks',        label: 'Tıklama',   align: 'right', render: v => formatNumber(Number(v)) },
  { key: 'ctr',           label: 'CTR',       align: 'right', render: v => v != null ? formatPercent(Number(v)) : '—' },
];

export default function Campaigns() {
  const { apiParams } = useFilters();
  const [campaigns, setCampaigns] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlatform, setLoadingPlatform] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true); setLoadingPlatform(true);
    const [campRes, platRes] = await Promise.allSettled([
      getCampaignPerformance(apiParams),
      getPlatformPerformance(apiParams),
    ]);
    if (campRes.status === 'fulfilled') setCampaigns(campRes.value.data.data.rows ?? []);
    setLoading(false);
    if (platRes.status === 'fulfilled') setPlatforms(platRes.value.data.data.rows ?? []);
    setLoadingPlatform(false);
  }, [apiParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const meta   = platforms.find(p => p.platform === 'meta')   ?? {};
  const google = platforms.find(p => p.platform === 'google') ?? {};

  const top10 = [...campaigns].sort((a, b) => Number(b.spend) - Number(a.spend)).slice(0, 10);

  const scatterMeta   = campaigns.filter(r => r.platform === 'meta'   && Number(r.spend) > 0).map(r => ({ x: Number(r.spend), y: Number(r.roas) || 0, label: r.campaign_name }));
  const scatterGoogle = campaigns.filter(r => r.platform === 'google' && Number(r.spend) > 0).map(r => ({ x: Number(r.spend), y: Number(r.roas) || 0, label: r.campaign_name }));

  return (
    <PageWrapper title="Kampanyalar" subtitle="Harcama, gelir ve ROAS bazlı kampanya analizi">
      <div style={{ marginBottom: 28 }}><FilterPanel /></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>Meta Ads</p>
          <KpiGrid title="">
            <KpiCard label="Harcama"  value={formatCurrency(Number(meta.spend))}   loading={loadingPlatform} />
            <KpiCard label="ROAS"     value={formatRoas(Number(meta.roas))}         loading={loadingPlatform} />
            <KpiCard label="CTR"      value={formatPercent(Number(meta.ctr))}       loading={loadingPlatform} />
            <KpiCard label="Tıklama"  value={formatNumber(Number(meta.clicks))}     loading={loadingPlatform} />
          </KpiGrid>
        </div>
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px 24px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>Google Ads</p>
          <KpiGrid title="">
            <KpiCard label="Harcama"  value={formatCurrency(Number(google.spend))} loading={loadingPlatform} />
            <KpiCard label="ROAS"     value={formatRoas(Number(google.roas))}       loading={loadingPlatform} />
            <KpiCard label="CTR"      value={formatPercent(Number(google.ctr))}     loading={loadingPlatform} />
            <KpiCard label="Tıklama"  value={formatNumber(Number(google.clicks))}   loading={loadingPlatform} />
          </KpiGrid>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <BarChart
          title="Top 10 Kampanya — Harcama vs Ciro"
          labels={top10.map(r => r.campaign_name.length > 24 ? r.campaign_name.slice(0, 24) + '…' : r.campaign_name)}
          datasets={[
            { label: 'Harcama (₺)', data: top10.map(r => Number(r.spend) || 0),   color: '#F79009' },
            { label: 'Ciro (₺)',    data: top10.map(r => Number(r.revenue) || 0), color: '#2E90FA' },
          ]}
          height={300}
          horizontal
          loading={loading}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <ScatterChart
          title="ROAS vs Harcama (Kampanya Bazlı)"
          datasets={[
            { label: 'Meta',   points: scatterMeta,   color: '#2E90FA' },
            { label: 'Google', points: scatterGoogle, color: '#F79009' },
          ]}
          xLabel="Harcama (₺)"
          yLabel="ROAS"
          height={280}
          loading={loading}
        />
      </div>

      <DataTable
        columns={campaignColumns}
        rows={campaigns}
        loading={loading}
        pageSize={15}
        emptyText="Kampanya verisi bulunamadı"
      />
    </PageWrapper>
  );
}
