import { Chart } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js';
import { FunnelController, TrapezoidElement } from 'chartjs-chart-funnel';

ChartJS.register(FunnelController, TrapezoidElement);

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

const STEP_LABELS = {
  session_start:  'Oturum Başlangıcı',
  view_item:      'Ürün Görüntüleme',
  add_to_cart:    'Sepete Ekle',
  begin_checkout: 'Ödeme Başlat',
  purchase:       'Satın Alma',
  conversion:     'Dönüşüm (GA4)',
};

// steps: [{ step, name, value, rate }]
export default function FunnelChart({ title, steps = [], height = 360, loading }) {
  if (loading) return <ChartSkeleton title={title} height={height} />;
  if (!steps.length) return <EmptyChart title={title} height={height} />;

  const labels = steps.map(s => STEP_LABELS[s.name] ?? s.name);
  const values = steps.map(s => s.value);

  const data = {
    labels,
    datasets: [{
      data: values,
      backgroundColor: [
        '#2E90FACC', '#1E7AE6CC', '#0D6AD0CC',
        '#0C5EBACC', '#0A52A4CC', '#08468ECC',
      ],
      borderColor: 'transparent',
      borderWidth: 0,
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
          label: (ctx) => {
            const step = steps[ctx.dataIndex];
            const rate = step.rate != null ? ` (${(step.rate * 100).toFixed(1)}%)` : '';
            return `${new Intl.NumberFormat('tr-TR').format(ctx.parsed)}${rate}`;
          },
        },
      },
    },
  };

  return (
    <div style={card}>
      {title && (
        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 16 }}>{title}</p>
      )}
      <div style={{ height }}>
        <Chart type="funnel" data={data} options={options} />
      </div>
    </div>
  );
}
