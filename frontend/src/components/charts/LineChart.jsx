import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const COLORS = ['#EE3423', '#221F1F', '#2E90FA', '#12B76A', '#F79009', '#7A5AF8'];

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

export default function LineChart({ title, datasets = [], labels = [], height = 280, loading }) {
  if (loading) return <ChartSkeleton title={title} height={height} />;
  if (!datasets.length || !labels.length) return <EmptyChart title={title} height={height} />;

  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.color ?? COLORS[i % COLORS.length],
      backgroundColor: `${ds.color ?? COLORS[i % COLORS.length]}18`,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      fill: ds.fill ?? false,
      tension: 0.35,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'top',
        labels: { font: { family: 'Futura PT, Century Gothic, sans-serif', size: 12 }, color: '#667085', boxWidth: 12, padding: 16 },
      },
      tooltip: { bodyFont: { family: 'Futura PT, Century Gothic, sans-serif' }, titleFont: { family: 'Futura PT, Century Gothic, sans-serif' } },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#98A2B3', font: { size: 11, family: 'Futura PT, Century Gothic, sans-serif' }, maxTicksLimit: 10 },
      },
      y: {
        grid: { color: '#F2F4F7', drawBorder: false },
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
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
