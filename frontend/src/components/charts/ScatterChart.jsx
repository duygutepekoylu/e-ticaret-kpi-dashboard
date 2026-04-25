import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS, LinearScale, PointElement,
  Tooltip, Legend,
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

const COLORS = ['#EE3423', '#2E90FA', '#12B76A', '#F79009', '#7A5AF8', '#221F1F'];

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

// points: [{ x, y, label }]
// datasets: [{ label, points, color }]
export default function ScatterChart({ title, datasets = [], xLabel = 'X', yLabel = 'Y', height = 300, loading }) {
  if (loading) return <ChartSkeleton title={title} height={height} />;
  if (!datasets.length || !datasets.some(d => d.points?.length)) return <EmptyChart title={title} height={height} />;

  const data = {
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.points.map(p => ({ x: p.x, y: p.y })),
      backgroundColor: `${ds.color ?? COLORS[i % COLORS.length]}CC`,
      pointRadius: 6,
      pointHoverRadius: 8,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'top',
        labels: { font: { family: 'Futura PT, Century Gothic, sans-serif', size: 12 }, color: '#667085', boxWidth: 12 },
      },
      tooltip: {
        bodyFont: { family: 'Futura PT, Century Gothic, sans-serif' },
        titleFont: { family: 'Futura PT, Century Gothic, sans-serif' },
        callbacks: {
          label: (ctx) => {
            const ds = datasets[ctx.datasetIndex];
            const point = ds?.points?.[ctx.dataIndex];
            const name = point?.label ? `${point.label}: ` : '';
            return `${name}${xLabel} ${ctx.parsed.x.toFixed(2)} · ${yLabel} ${ctx.parsed.y.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: xLabel, color: '#98A2B3', font: { size: 11, family: 'Futura PT, Century Gothic, sans-serif' } },
        grid: { color: '#F2F4F7' },
        ticks: { color: '#98A2B3', font: { size: 11, family: 'Futura PT, Century Gothic, sans-serif' } },
      },
      y: {
        title: { display: true, text: yLabel, color: '#98A2B3', font: { size: 11, family: 'Futura PT, Century Gothic, sans-serif' } },
        grid: { color: '#F2F4F7' },
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
        <Scatter data={data} options={options} />
      </div>
    </div>
  );
}
