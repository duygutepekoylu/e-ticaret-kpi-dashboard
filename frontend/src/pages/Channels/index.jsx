import { useEffect, useState, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import FilterPanel from '../../components/filters/FilterPanel';
import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';
import DataTable from '../../components/tables/DataTable';
import { useFilters } from '../../hooks/useFilters';
import { getChannelPerformance } from '../../services/api';
import { formatCurrency, formatNumber, formatPercent, formatRoas } from '../../utils/format';

const columns = [
  { key: 'channel_group', label: 'Kanal' },
  { key: 'sessions',       label: 'Oturum',        align: 'right', render: v => formatNumber(Number(v)) },
  { key: 'orders',         label: 'Sipariş',        align: 'right', render: v => formatNumber(Number(v)) },
  { key: 'revenue',        label: 'Ciro',           align: 'right', render: v => formatCurrency(Number(v)) },
  { key: 'spend',          label: 'Harcama',        align: 'right', render: v => formatCurrency(Number(v)) },
  { key: 'roas',           label: 'ROAS',           align: 'right', render: v => formatRoas(Number(v)) },
  { key: 'conversion_rate', label: 'Dönüşüm Oranı', align: 'right', render: v => formatPercent(Number(v)) },
];

export default function Channels() {
  const { apiParams, setFilter } = useFilters();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getChannelPerformance(apiParams);
      setChannels(res.data.data.rows ?? []);
    } catch (_) {}
    setLoading(false);
  }, [apiParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleChannelClick = (name) => setFilter('channel', name);

  return (
    <PageWrapper title="Kanallar" subtitle="Kanal bazlı gelir, dönüşüm ve ROAS karşılaştırması">
      <div style={{ marginBottom: 28 }}><FilterPanel /></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <DonutChart
          title="Kanal Gelir Dağılımı"
          labels={channels.map(r => r.channel_group)}
          values={channels.map(r => Number(r.revenue) || 0)}
          height={260}
          loading={loading}
          onSliceClick={handleChannelClick}
        />
        <BarChart
          title="Kanal Bazlı ROAS"
          labels={channels.map(r => r.channel_group)}
          datasets={[{
            label: 'ROAS',
            data: channels.map(r => r.roas != null ? Number(r.roas) : 0),
            color: '#2E90FA',
          }]}
          height={260}
          horizontal
          loading={loading}
        />
      </div>

      <BarChart
        title="Kanal Bazlı Ciro vs Harcama"
        labels={channels.map(r => r.channel_group)}
        datasets={[
          { label: 'Ciro (₺)',    data: channels.map(r => Number(r.revenue) || 0), color: '#12B76A' },
          { label: 'Harcama (₺)', data: channels.map(r => Number(r.spend) || 0),   color: '#F79009' },
        ]}
        height={240}
        horizontal
        loading={loading}
      />

      <div style={{ marginTop: 24 }}>
        <DataTable
          columns={columns}
          rows={channels}
          loading={loading}
          emptyText="Kanal verisi bulunamadı"
        />
      </div>
    </PageWrapper>
  );
}
