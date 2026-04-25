import { useEffect, useState, useCallback } from 'react';
import PageWrapper from '../../components/layout/PageWrapper';
import FilterPanel from '../../components/filters/FilterPanel';
import KpiCard from '../../components/kpi/KpiCard';
import KpiGrid from '../../components/kpi/KpiGrid';
import LineChart from '../../components/charts/LineChart';
import BarChart from '../../components/charts/BarChart';
import DonutChart from '../../components/charts/DonutChart';
import ScatterChart from '../../components/charts/ScatterChart';
import DataTable from '../../components/tables/DataTable';
import { useFilters } from '../../hooks/useFilters';
import {
  getKpiSummary,
  getDashboardTrend,
  getChannelPerformance,
  getCampaignPerformance,
  getDateRange,
} from '../../services/api';
import {
  formatCurrency, formatNumber, formatPercent,
  formatRoas, formatDuration, formatDate,
} from '../../utils/format';

const SECTION_GAP = { marginBottom: 32 };
const ROW_2COL = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 };

function getPrevPeriodParams(dateFrom, dateTo) {
  if (!dateFrom || !dateTo) return null;
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const days = Math.round((to - from) / (1000 * 60 * 60 * 24));
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days);
  return {
    date_from: prevFrom.toISOString().split('T')[0],
    date_to:   prevTo.toISOString().split('T')[0],
  };
}

// null gelirse (önceki dönem verisi yok) trend ok gizlenir
function calcTrend(current, previous) {
  const c = Number(current), p = Number(previous);
  if (!current || !previous || isNaN(c) || isNaN(p) || p === 0) return null;
  return (c - p) / Math.abs(p);
}

function Section({ title, children, style }) {
  return (
    <div style={{ ...SECTION_GAP, ...style }}>
      {title && (
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 16 }}>
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { apiParams, setFilter, setFilters } = useFilters();

  const [kpi, setKpi] = useState(null);
  const [kpiPrev, setKpiPrev] = useState(null);
  const [trend, setTrend] = useState([]);
  const [channels, setChannels] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  const [loadingKpi, setLoadingKpi] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingChannel, setLoadingChannel] = useState(true);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  // Mount'ta DB'deki gerçek veri aralığını çek.
  // useUrlSync URL'deki tarihleri filters'a zaten yazmış olabilir; sadece
  // filters boşsa (fresh visit) override et.
  useEffect(() => {
    if (apiParams.date_from && apiParams.date_to) return;
    getDateRange()
      .then(res => {
        const { date_from, date_to } = res.data.data;
        setFilters({
          dateFrom: date_from.split('T')[0],
          dateTo: date_to.split('T')[0],
        });
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = useCallback(async () => {
    setLoadingKpi(true);
    setLoadingTrend(true);
    setLoadingChannel(true);
    setLoadingCampaign(true);

    const prevParams = getPrevPeriodParams(apiParams.date_from, apiParams.date_to);

    const [kpiRes, kpiPrevRes, trendRes, channelRes, campaignRes] = await Promise.allSettled([
      getKpiSummary(apiParams),
      prevParams ? getKpiSummary(prevParams) : Promise.resolve(null),
      getDashboardTrend(apiParams),
      getChannelPerformance(apiParams),
      getCampaignPerformance(apiParams),
    ]);

    if (kpiRes.status === 'fulfilled') setKpi(kpiRes.value.data.data);
    if (kpiPrevRes.status === 'fulfilled' && kpiPrevRes.value) setKpiPrev(kpiPrevRes.value.data.data);
    else setKpiPrev(null);
    setLoadingKpi(false);

    if (trendRes.status === 'fulfilled') setTrend(trendRes.value.data.data.rows ?? []);
    setLoadingTrend(false);

    if (channelRes.status === 'fulfilled') setChannels(channelRes.value.data.data.rows ?? []);
    setLoadingChannel(false);

    if (campaignRes.status === 'fulfilled') setCampaigns(campaignRes.value.data.data.rows ?? []);
    setLoadingCampaign(false);
  }, [apiParams]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // kpi_daily_traffic'te tarih başına birden fazla satır olabilir (kaynak bazlı).
  // Trend grafiği için tarihe göre grupla: session'ları topla, revenue'yu bir kez al.
  const trendByDate = {};
  trend.forEach(r => {
    const d = (r.date ?? '').toString().split('T')[0];
    if (!trendByDate[d]) trendByDate[d] = { date: d, sessions: 0, net_revenue: null };
    trendByDate[d].sessions += Number(r.sessions) || 0;
    if (trendByDate[d].net_revenue === null && r.net_revenue != null) {
      trendByDate[d].net_revenue = Number(r.net_revenue) || 0;
    }
  });
  const trendAgg = Object.values(trendByDate).sort((a, b) => a.date.localeCompare(b.date));

  const trendLabels = trendAgg.map(r => formatDate(r.date));
  const trendRevenue = trendAgg.map(r => r.net_revenue ?? 0);
  const trendSessions = trendAgg.map(r => r.sessions);

  // -- Trend okları: mevcut dönem vs önceki dönem --
  const t = kpi ?? {};
  const p = kpiPrev ?? {};
  const trends = {
    sessions:         calcTrend(t.traffic?.total_sessions,           p.traffic?.total_sessions),
    users:            calcTrend(t.traffic?.total_users,              p.traffic?.total_users),
    bounceRate:       calcTrend(p.traffic?.avg_bounce_rate,          t.traffic?.avg_bounce_rate), // düşük = iyi → ters
    sessionDuration:  calcTrend(t.traffic?.avg_session_duration,     p.traffic?.avg_session_duration),
    spend:            calcTrend(t.ads?.total_spend,                  p.ads?.total_spend),
    roas:             calcTrend(t.ads?.overall_roas,                 p.ads?.overall_roas),
    clicks:           calcTrend(t.ads?.total_clicks,                 p.ads?.total_clicks),
    impressions:      calcTrend(t.ads?.total_impressions,            p.ads?.total_impressions),
    revenue:          calcTrend(t.sales?.total_revenue,              p.sales?.total_revenue),
    orders:           calcTrend(t.sales?.total_orders,               p.sales?.total_orders),
    newRevenue:       calcTrend(t.sales?.new_customer_revenue,       p.sales?.new_customer_revenue),
    returningRevenue: calcTrend(t.sales?.returning_customer_revenue, p.sales?.returning_customer_revenue),
  };

  // -- Kanal grafik verileri --
  const channelLabels = channels.map(r => r.channel_group);
  const channelRevenues = channels.map(r => Number(r.revenue) || 0);

  // -- Kampanya grafik (top 10 spend) --
  const topCampaigns = [...campaigns].sort((a, b) => Number(b.spend) - Number(a.spend)).slice(0, 10);
  const campaignLabels = topCampaigns.map(r => r.campaign_name.length > 22 ? r.campaign_name.slice(0, 22) + '…' : r.campaign_name);
  const campaignSpend = topCampaigns.map(r => Number(r.spend) || 0);
  const campaignRevenue = topCampaigns.map(r => Number(r.revenue) || 0);

  // -- Scatter: ROAS vs Harcama (kampanya bazlı) --
  const scatterMeta = campaigns
    .filter(r => r.platform === 'meta' && Number(r.spend) > 0)
    .map(r => ({ x: Number(r.spend), y: Number(r.roas) || 0, label: r.campaign_name }));
  const scatterGoogle = campaigns
    .filter(r => r.platform === 'google' && Number(r.spend) > 0)
    .map(r => ({ x: Number(r.spend), y: Number(r.roas) || 0, label: r.campaign_name }));

  // -- Kanal cross-filter --
  const handleChannelClick = (channelName) => {
    setFilter('channel', channelName);
  };

  // -- Kampanya tablosu kolonları --
  const campaignColumns = [
    { key: 'campaign_name', label: 'Kampanya' },
    { key: 'platform', label: 'Platform', render: v => v === 'meta' ? 'Meta' : 'Google' },
    { key: 'spend', label: 'Harcama', align: 'right', render: v => formatCurrency(Number(v)) },
    { key: 'revenue', label: 'Ciro', align: 'right', render: v => formatCurrency(Number(v)) },
    { key: 'roas', label: 'ROAS', align: 'right', render: v => formatRoas(Number(v)) },
    { key: 'ctr', label: 'CTR', align: 'right', render: v => v != null ? formatPercent(Number(v)) : '—' },
  ];

  return (
    <PageWrapper title="Dashboard" subtitle="Genel KPI özeti ve trend analizi">
      <div style={{ marginBottom: 28 }}>
        <FilterPanel />
      </div>

      {/* Hero KPI — 3 ana metrik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 28 }}>
        <KpiCard hero label="Toplam Ciro"  value={formatCurrency(kpi?.sales?.total_revenue)} trend={trends.revenue} loading={loadingKpi} />
        <KpiCard hero label="Genel ROAS"   value={formatRoas(kpi?.ads?.overall_roas)}         trend={trends.roas}    loading={loadingKpi} />
        <KpiCard hero label="Oturumlar"    value={formatNumber(kpi?.traffic?.total_sessions)} trend={trends.sessions} loading={loadingKpi} />
      </div>

      {/* Detay KPI Kartları */}
      <KpiGrid title="Trafik">
        <KpiCard label="Kullanıcılar" value={formatNumber(kpi?.traffic?.total_users)}          trend={trends.users}           loading={loadingKpi} />
        <KpiCard label="Hemen Çıkma" value={formatPercent(kpi?.traffic?.avg_bounce_rate)}     trend={trends.bounceRate}      loading={loadingKpi} />
        <KpiCard label="Ort. Süre"   value={formatDuration(kpi?.traffic?.avg_session_duration)} trend={trends.sessionDuration} loading={loadingKpi} />
      </KpiGrid>

      <KpiGrid title="Reklam">
        <KpiCard label="Toplam Harcama"  value={formatCurrency(kpi?.ads?.total_spend)}       trend={trends.spend}       loading={loadingKpi} />
        <KpiCard label="Toplam Tıklama"  value={formatNumber(kpi?.ads?.total_clicks)}         trend={trends.clicks}      loading={loadingKpi} />
        <KpiCard label="Toplam Gösterim" value={formatNumber(kpi?.ads?.total_impressions)}    trend={trends.impressions} loading={loadingKpi} />
      </KpiGrid>

      <KpiGrid title="Satış">
        <KpiCard label="Sipariş Sayısı"      value={formatNumber(kpi?.sales?.total_orders)}                 trend={trends.orders}           loading={loadingKpi} />
        <KpiCard label="Yeni Müşteri Cirosu" value={formatCurrency(kpi?.sales?.new_customer_revenue)}       trend={trends.newRevenue}       loading={loadingKpi} />
        <KpiCard label="Geri Dönen Müşteri"  value={formatCurrency(kpi?.sales?.returning_customer_revenue)} trend={trends.returningRevenue} loading={loadingKpi} />
      </KpiGrid>

      {/* Trend Grafiği */}
      <Section>
        <LineChart
          title="Ciro & Oturum Trendi"
          labels={trendLabels}
          datasets={[
            { label: 'Ciro (₺)', data: trendRevenue, color: '#2E90FA', fill: true },
            { label: 'Oturumlar', data: trendSessions, color: '#7A5AF8' },
          ]}
          height={300}
          loading={loadingTrend}
        />
      </Section>

      {/* Kanal + Kampanya */}
      <Section>
        <div style={ROW_2COL}>
          <DonutChart
            title="Kanal Gelir Dağılımı"
            labels={channelLabels}
            values={channelRevenues}
            height={260}
            loading={loadingChannel}
            onSliceClick={handleChannelClick}
          />
          <BarChart
            title="Top 10 Kampanya — Harcama vs Ciro"
            labels={campaignLabels}
            datasets={[
              { label: 'Harcama (₺)', data: campaignSpend, color: '#F79009' },
              { label: 'Ciro (₺)', data: campaignRevenue, color: '#2E90FA' },
            ]}
            height={260}
            horizontal
            loading={loadingCampaign}
          />
        </div>
      </Section>

      {/* ROAS vs Spend Scatter */}
      <Section>
        <ScatterChart
          title="ROAS vs Harcama (Kampanya Bazlı)"
          datasets={[
            { label: 'Meta', points: scatterMeta, color: '#2E90FA' },
            { label: 'Google', points: scatterGoogle, color: '#F79009' },
          ]}
          xLabel="Harcama (₺)"
          yLabel="ROAS"
          height={300}
          loading={loadingCampaign}
        />
      </Section>

      {/* Kampanya Tablosu */}
      <Section title="Kampanya Detayları">
        <DataTable
          columns={campaignColumns}
          rows={campaigns}
          loading={loadingCampaign}
          pageSize={10}
        />
      </Section>
    </PageWrapper>
  );
}
