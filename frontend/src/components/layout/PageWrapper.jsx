export default function PageWrapper({ title, subtitle, children, actions }) {
  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
