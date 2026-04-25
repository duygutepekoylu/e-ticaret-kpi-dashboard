import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#2E90FA', '#12B76A', '#F79009', '#7A5AF8', '#221F1F', '#EE3423'];

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

export default function DonutChart({ title, labels = [], values = [], height = 260, onSliceClick, loading }) {
  if (loading) return <ChartSkeleton title={title} height={height} />;
  if (!labels.length || !values.length) return <EmptyChart title={title} height={height} />;

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: COLORS.slice(0, labels.length),
      borderColor: 'var(--color-bg-card)',
      borderWidth: 3,
      hoverOffset: 6,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: { family: 'Futura PT, Century Gothic, sans-serif', size: 12 },
          color: '#667085',
          boxWidth: 10,
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: { bodyFont: { family: 'Futura PT, Century Gothic, sans-serif' }, titleFont: { family: 'Futura PT, Century Gothic, sans-serif' } },
    },
    onClick: onSliceClick
      ? (_, elements) => {
          if (elements.length > 0) onSliceClick(labels[elements[0].index]);
        }
      : undefined,
  };

  return (
    <div style={card}>
      {title && (
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>{title}</p>
      )}
      <div style={{ height }}>
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
