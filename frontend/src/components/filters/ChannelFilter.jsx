import { useState, useEffect } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { getChannels } from '../../services/api';

export default function ChannelFilter() {
  const { filters, setFilter } = useFilters();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getChannels()
      .then(res => setOptions(res.data.data?.channels || []))
      .catch(() => {});
  }, []);

  return (
    <select
      value={filters.channel}
      onChange={(e) => setFilter('channel', e.target.value)}
      style={{
        padding: '6px 10px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        color: filters.channel ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        fontSize: 13,
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
        minWidth: 130,
      }}
    >
      <option value="">Tüm Kanallar</option>
      {options.map(ch => (
        <option key={ch} value={ch}>{ch}</option>
      ))}
    </select>
  );
}
