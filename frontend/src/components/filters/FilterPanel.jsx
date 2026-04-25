import { useState } from 'react';
import { useFilters } from '../../hooks/useFilters';
import DateRangePicker from './DateRangePicker';
import ChannelFilter from './ChannelFilter';
import CampaignFilter from './CampaignFilter';
import DeviceFilter from './DeviceFilter';
import CityFilter from './CityFilter';
import AdvancedFilters from './AdvancedFilters';

function hasActiveAdvanced(filters) {
  return filters.revenueMin || filters.revenueMax || filters.roasMin || filters.roasMax;
}

function ActiveBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 16, height: 16, borderRadius: '50%',
      background: 'var(--color-brand)', color: '#fff',
      fontSize: 10, fontWeight: 700, marginLeft: 4,
    }}>{count}</span>
  );
}

export default function FilterPanel() {
  const { filters, resetFilters } = useFilters();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const advancedCount = [filters.revenueMin, filters.revenueMax, filters.roasMin, filters.roasMax]
    .filter(Boolean).length;

  const hasAnyFilter =
    filters.channel || filters.campaign || filters.device || filters.city || hasActiveAdvanced(filters);

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      {/* Panel başlığı */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px',
        borderBottom: collapsed ? 'none' : '1px solid var(--color-border-light)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Filtreler
          </span>
          {hasAnyFilter && (
            <span style={{
              fontSize: 11, color: 'var(--color-brand)',
              background: 'var(--color-brand-light)',
              padding: '1px 7px', borderRadius: 10,
            }}>Aktif</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {hasAnyFilter && (
            <button
              onClick={resetFilters}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'var(--color-text-muted)',
                padding: '3px 8px', borderRadius: 5,
              }}
            >
              Sıfırla
            </button>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', padding: 4, lineHeight: 1,
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Filtre alanları */}
      {!collapsed && (
        <div style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <DateRangePicker />
            <ChannelFilter />
            <CampaignFilter />
            <DeviceFilter />
            <CityFilter />
            <button
              onClick={() => setShowAdvanced(s => !s)}
              style={{
                padding: '6px 12px',
                background: showAdvanced ? 'var(--color-brand-light)' : 'var(--color-bg-page)',
                border: `1px solid ${showAdvanced ? 'var(--color-brand-border)' : 'var(--color-border)'}`,
                borderRadius: 6,
                color: showAdvanced ? 'var(--color-brand)' : 'var(--color-text-secondary)',
                fontSize: 13,
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              Gelişmiş
              <ActiveBadge count={advancedCount} />
            </button>
          </div>

          {showAdvanced && (
            <div style={{
              marginTop: 12, paddingTop: 12,
              borderTop: '1px solid var(--color-border-light)',
            }}>
              <AdvancedFilters />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
