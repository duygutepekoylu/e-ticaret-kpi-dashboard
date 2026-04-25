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
  width: 100,
};

const labelStyle = {
  fontSize: 11,
  color: 'var(--color-text-muted)',
  marginBottom: 4,
  display: 'block',
};

export default function AdvancedFilters() {
  const { filters, setFilter } = useFilters();

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <div>
        <label style={labelStyle}>Gelir Min (₺)</label>
        <input
          type="number"
          min="0"
          placeholder="0"
          value={filters.revenueMin}
          onChange={(e) => setFilter('revenueMin', e.target.value)}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Gelir Max (₺)</label>
        <input
          type="number"
          min="0"
          placeholder="∞"
          value={filters.revenueMax}
          onChange={(e) => setFilter('revenueMax', e.target.value)}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>ROAS Min</label>
        <input
          type="number"
          min="0"
          step="0.1"
          placeholder="0"
          value={filters.roasMin}
          onChange={(e) => setFilter('roasMin', e.target.value)}
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>ROAS Max</label>
        <input
          type="number"
          min="0"
          step="0.1"
          placeholder="∞"
          value={filters.roasMax}
          onChange={(e) => setFilter('roasMax', e.target.value)}
          style={inputStyle}
        />
      </div>
    </div>
  );
}
