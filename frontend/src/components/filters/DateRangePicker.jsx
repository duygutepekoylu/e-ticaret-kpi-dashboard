import { useFilters } from '../../hooks/useFilters';

const inputStyle = {
  padding: '6px 10px',
  background: 'var(--color-bg-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  color: 'var(--color-text-primary)',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  cursor: 'pointer',
};

export default function DateRangePicker() {
  const { filters, setFilter } = useFilters();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <input
        type="date"
        value={filters.dateFrom}
        max={filters.dateTo}
        onChange={(e) => setFilter('dateFrom', e.target.value)}
        style={inputStyle}
      />
      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>—</span>
      <input
        type="date"
        value={filters.dateTo}
        min={filters.dateFrom}
        onChange={(e) => setFilter('dateTo', e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}
