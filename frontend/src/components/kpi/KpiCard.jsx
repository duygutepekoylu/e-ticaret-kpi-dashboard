function Skeleton({ width = '100%', height = 16, radius = 4 }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'var(--color-border-light)',
      animation: 'kpi-pulse 1.4s ease-in-out infinite',
    }} />
  );
}

function TrendBadge({ trend }) {
  const isPos = trend >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      fontSize: 11, fontWeight: 600,
      color: isPos ? 'var(--color-success)' : 'var(--color-danger)',
      background: isPos ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
      padding: '2px 7px', borderRadius: 4,
    }}>
      {isPos ? '↑' : '↓'} {Math.abs(trend * 100).toFixed(1)}%
    </span>
  );
}

export default function KpiCard({ label, value, subtitle, trend, loading }) {
  const card = {
    background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  };

  if (loading) {
    return (
      <div style={card}>
        <Skeleton width="55%" height={11} />
        <Skeleton width="75%" height={28} radius={6} />
        <Skeleton width="35%" height={11} />
      </div>
    );
  }

  return (
    <div style={card}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}
      </p>
      <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.15 }}>
        {value ?? '—'}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 20 }}>
        {trend != null && <TrendBadge trend={trend} />}
        {subtitle && (
          <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{subtitle}</p>
        )}
      </div>
    </div>
  );
}
