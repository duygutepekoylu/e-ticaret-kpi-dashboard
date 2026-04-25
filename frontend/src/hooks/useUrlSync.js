import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFilters } from './useFilters';

// URL param adı → filtre state key eşlemesi
const URL_TO_FILTER = {
  date_from:   'dateFrom',
  date_to:     'dateTo',
  channel:     'channel',
  campaign:    'campaign',
  device:      'device',
  city:        'city',
  revenue_min: 'revenueMin',
  revenue_max: 'revenueMax',
  roas_min:    'roasMin',
  roas_max:    'roasMax',
};

const FILTER_TO_URL = Object.fromEntries(
  Object.entries(URL_TO_FILTER).map(([k, v]) => [v, k])
);

export function useUrlSync() {
  const { filters, setFilters } = useFilters();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialized = useRef(false);

  // İlk render: URL → filtreler
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const fromUrl = {};
    for (const [urlKey, filterKey] of Object.entries(URL_TO_FILTER)) {
      const val = searchParams.get(urlKey);
      if (val) fromUrl[filterKey] = val;
    }
    if (Object.keys(fromUrl).length > 0) setFilters(fromUrl);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtre değişince: filtreler → URL
  useEffect(() => {
    if (!initialized.current) return;
    const params = {};
    for (const [filterKey, urlKey] of Object.entries(FILTER_TO_URL)) {
      if (filters[filterKey]) params[urlKey] = filters[filterKey];
    }
    setSearchParams(params, { replace: true });
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps
}
