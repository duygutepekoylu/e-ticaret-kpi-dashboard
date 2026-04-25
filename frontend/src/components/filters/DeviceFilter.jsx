import { useState, useEffect } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { getDevices } from '../../services/api';

export default function DeviceFilter() {
  const { filters, setFilter } = useFilters();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getDevices()
      .then(res => setOptions(res.data.data?.devices || []))
      .catch(() => {});
  }, []);

  return (
    <select
      value={filters.device}
      onChange={(e) => setFilter('device', e.target.value)}
      style={{
        padding: '6px 10px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        color: filters.device ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        fontSize: 13,
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
        minWidth: 120,
      }}
    >
      <option value="">Tüm Cihazlar</option>
      {options.map(d => (
        <option key={d} value={d}>{d}</option>
      ))}
    </select>
  );
}
