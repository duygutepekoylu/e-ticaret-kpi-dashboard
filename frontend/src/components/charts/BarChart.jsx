import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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

export default function BarChart({ title, labels = [], datasets = [], height = 280, horizontal = false, loading }) {
  if (loading) return <ChartSkeleton title={title} height={height} />;
  if (!labels.length || !datasets.length) return <EmptyChart title={title} height={height} />;

  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      label: ds.label,
      data: ds.data,
      backgroundColor: ds.color ?? COLORS[i % COLORS.length],
      borderRadius: 4,
      borderSkipped: false,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'top',
        labels: { font: { family: 'Futura PT, Century Gothic, sans-serif', size: 12 }, color: '#667085', boxWidth: 12 },
      },
      tooltip: { bodyFont: { family: 'Futura PT, Century Gothic, sans-serif' }, titleFont: { family: 'Futura PT, Century Gothic, sans-serif' } },
    },
    scales: {
      x: {
        grid: { display: horizontal },
        ticks: { color: '#98A2B3', font: { size: 11, family: 'Futura PT, Century Gothic, sans-serif' }, maxRotation: horizontal ? 0 : 35 },
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
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
