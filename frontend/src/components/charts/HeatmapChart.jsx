import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';

ChartJS.register(MatrixController, MatrixElement);

const card = {
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 12,
  padding: '20px 24px',
};

function ChartSkeleton({ title, height }) {
  return (
    <div style={card}>
      {title && <div style={{ width: 140, height: 14, borderRadius: 4, background: 'var(--color-border-light)', marginBottom: 16 }} />}
      <div style={{ height, borderRadius: 8, background: 'var(--color-border-light)' }} />
    </div>
  );
}

function EmptyChart({ title, height }) {
  return (
    <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
      {title && <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>{title}</p>}
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Veri bulunamadı</p>
      </div>
    </div>
  );
}

function retentionColor(rate) {
  const r = Math.min(1, Math.max(0, rate));
  if (r >= 0.8) return '#12B76A';
  if (r >= 0.6) return '#32D583';
  if (r >= 0.4) return '#F79009';
  if (r >= 0.2) return '#FDB022';
  return '#F04438';
}

// points: [{ cohort_month, offset_month, retention_rate, active_customers, revenue }]
export default function HeatmapChart({ title, points = [], height = 300, loading }) {
  if (loading) return <ChartSkeleton title={title} height={height} />;
  if (!points.length) return <EmptyChart title={title} height={height} />;

  const cohorts = [...new Set(points.map(p => p.cohort_month))].sort();
  const offsets = [...new Set(points.map(p => p.offset_month))].sort((a, b) => a - b);

  const matrixData = points.map(p => ({
    x: `Ay +${p.offset_month}`,
    y: p.cohort_month,
    v: Math.min(1, Number(p.retention_rate) || 0),
    raw: p,
  }));

  const data = {
    datasets: [{
      label: 'Retention',
      data: matrixData,
      backgroundColor: (ctx) => {
        const v = ctx.dataset.data[ctx.dataIndex]?.v ?? 0;
        return retentionColor(v);
      },
      borderColor: 'var(--color-bg-card)',
      borderWidth: 2,
      width: ({ chart }) => (chart.chartArea?.width ?? 400) / (offsets.length + 1) - 2,
      height: ({ chart }) => (chart.chartArea?.height ?? 200) / (cohorts.length + 1) - 2,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        bodyFont: { family: 'Futura PT, Century Gothic, sans-serif' },
        titleFont: { family: 'Futura PT, Century Gothic, sans-serif' },
        callbacks: {
          title: (items) => {
            const d = items[0]?.dataset?.data[items[0]?.dataIndex]?.raw;
            return d ? `${d.cohort_month} — Ay +${d.offset_month}` : '';
          },
          label: (ctx) => {
            const d = ctx.dataset.data[ctx.dataIndex]?.raw;
            if (!d) return '';
            const rate = Number(d.retention_rate);
            return [
              `Retention: ${(rate * 100).toFixed(1)}%`,
              `Aktif müşteri: ${d.active_customers}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category',
        labels: offsets.map(o => `Ay +${o}`),
        grid: { display: false },
        ticks: { color: '#98A2B3', font: { size: 11, family: 'Futura PT, Century Gothic, sans-serif' } },
      },
      y: {
        type: 'category',
        labels: cohorts,
        offset: true,
        grid: { display: false },
        ticks: { color: '#98A2B3', font: { size: 11, family: 'Futura PT, Century Gothic, sans-serif' } },
      },
    },
  };

  return (
    <div style={card}>
      {title && (
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>{title}</p>
      )}
      <div style={{ height }}>
        <Chart type="matrix" data={data} options={options} />
      </div>
    </div>
  );
}
