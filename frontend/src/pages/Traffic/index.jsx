import { useEffect, useState, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import FilterPanel from '../../components/filters/FilterPanel';
import KpiCard from '../../components/kpi/KpiCard';
import KpiGrid from '../../components/kpi/KpiGrid';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import { useFilters } from '../../hooks/useFilters';
import { getKpiSummary, getDashboardTrend, getChannelPerformance } from '../../services/api';
import { formatNumber, formatPercent, formatDuration, formatDate } from '../../utils/format';

export default function Traffic() {
  const { apiParams } = useFilters();
  const [kpi, setKpi] = useState(null);
  const [trend, setTrend] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loadingKpi, setLoadingKpi] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingChannel, setLoadingChannel] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoadingKpi(true); setLoadingTrend(true); setLoadingChannel(true);
    const [kpiRes, trendRes, channelRes] = await Promise.allSettled([
      getKpiSummary(apiParams),
      getDashboardTrend(apiParams),
      getChannelPerformance(apiParams),
    ]);
    if (kpiRes.status === 'fulfilled') setKpi(kpiRes.value.data.data);
    setLoadingKpi(false);
    if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data.data.rows ?? []);
    setLoadingTrend(false);
    if (channelRes.status === 'fulfilled') setChannels(channelRes.value.data.data.rows ?? []);
    setLoadingChannel(false);
  }, [apiParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const trendByDate = {};
  trend.forEach(r => {
    const d = (r.date ?? '').toString().split('T')[0];
    if (!trendByDate[d]) trendByDate[d] = { date: d, sessions: 0, users: 0 };
    trendByDate[d].sessions += Number(r.sessions) || 0;
    trendByDate[d].users += Number(r.users) || 0;
  });
  const trendAgg = Object.values(trendByDate).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <PageWrapper title="Trafik" subtitle="Oturum, kullanıcı ve davranış metrikleri">
      <div style={{ marginBottom: 28 }}><FilterPanel /></div>

      <KpiGrid title="Trafik Özeti">
        <KpiCard label="Toplam Oturum"    value={formatNumber(kpi?.traffic?.total_sessions)}          loading={loadingKpi} />
        <KpiCard label="Toplam Kullanıcı" value={formatNumber(kpi?.traffic?.total_users)}             loading={loadingKpi} />
        <KpiCard label="Dönüşüm"          value={formatNumber(kpi?.traffic?.total_conversions)}       loading={loadingKpi} />
        <KpiCard label="Hemen Çıkma"      value={formatPercent(kpi?.traffic?.avg_bounce_rate)}        loading={loadingKpi} />
        <KpiCard label="Ort. Oturum Süresi" value={formatDuration(kpi?.traffic?.avg_session_duration)} loading={loadingKpi} />
      </KpiGrid>

      <div style={{ marginBottom: 24 }}>
        <LineChart
          title="Oturum & Kullanıcı Trendi"
          labels={trendAgg.map(r => formatDate(r.date))}
          datasets={[
            { label: 'Oturum', data: trendAgg.map(r => r.sessions), color: '#EE3423' },
            { label: 'Kullanıcı', data: trendAgg.map(r => r.users), color: '#2E90FA' },
          ]}
          height={280}
          loading={loadingTrend}
        />
      </div>

      <BarChart
        title="Kanal Bazlı Oturum Dağılımı"
        labels={channels.map(r => r.channel_group)}
        datasets={[{ label: 'Oturum', data: channels.map(r => Number(r.sessions) || 0), color: '#EE3423' }]}
        height={260}
        horizontal
        loading={loadingChannel}
      />
    </PageWrapper>
  );
}
