import { createContext, useContext, useState, useCallback, createElement } from 'react';

function getDefaultDates() {
  return { dateFrom: '', dateTo: '' };
}

const DEFAULT_FILTERS = {
  ...getDefaultDates(),
  channel: '',
  campaign: '',
  device: '',
  city: '',
  revenueMin: '',
  revenueMax: '',
  roasMin: '',
  roasMax: '',
};

const FilterContext = createContext(null);

export function FilterProvider({ children }) {
  const [filters, setFiltersState] = useState(DEFAULT_FILTERS);

  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);

  const setFilters = useCallback((updates) => {
    setFiltersState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState({ ...DEFAULT_FILTERS, ...getDefaultDates() });
  }, []);

  // Boş değerleri atarak API'ye gönderilecek temiz params objesi
  const apiParams = Object.fromEntries(
    Object.entries(filters)
      .filter(([, v]) => v !== '')
      .map(([k, v]) => {
        const urlKeyMap = {
          dateFrom: 'date_from',
          dateTo: 'date_to',
          revenueMin: 'revenue_min',
          revenueMax: 'revenue_max',
          roasMin: 'roas_min',
          roasMax: 'roas_max',
        };
        return [urlKeyMap[k] ?? k, v];
      })
  );

  return createElement(
    FilterContext.Provider,
    { value: { filters, setFilter, setFilters, resetFilters, apiParams } },
    children
  );
}

export function useFilters() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error('useFilters must be used within FilterProvider');
  return ctx;
}
