import { useState, useEffect } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { getCampaigns } from '../../services/api';

export default function CampaignFilter() {
  const { filters, setFilter } = useFilters();
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getCampaigns()
      .then(res => setOptions((res.data.data?.campaigns || []).map(c => c.campaign_name ?? c).filter(Boolean)))
      .catch(() => {});
  }, []);

  return (
    <select
      value={filters.campaign}
      onChange={(e) => setFilter('campaign', e.target.value)}
      style={{
        padding: '6px 10px',
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 6,
        color: filters.campaign ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
        fontSize: 13,
        fontFamily: 'inherit',
        outline: 'none',
        cursor: 'pointer',
        minWidth: 160,
      }}
    >
      <option value="">Tüm Kampanyalar</option>
      {options.map(c => (
        <option key={c} value={c}>{c}</option>
      ))}
    </select>
  );
}
