import { useState, useEffect } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { getCities } from '../../services/api';

export default function CityFilter() {
  const { filters, setFilter } = useFilters();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getCities()
      .then(res => setOptions(res.data.data?.cities || []))
      .catch(() => {});
  }, []);

  return (
    <select
      value={filters.city}
      onChange={(e) => setFilter('city', e.target.value)}
      style={{
        padding: '6px 10px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        color: filters.city ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        fontSize: 13,
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
        minWidth: 130,
      }}
    >
      <option value="">Tüm Şehirler</option>
      {options.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}
