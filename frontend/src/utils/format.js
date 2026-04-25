const TR = new Intl.NumberFormat('tr-TR');
const TR_DEC2 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const TR_CURRENCY = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

export const formatCurrency = (val) => {
  if (val == null || isNaN(val)) return '—';
  return TR_CURRENCY.format(val);
};

export const formatNumber = (val) => {
  if (val == null || isNaN(val)) return '—';
  return TR.format(Math.round(val));
};

export const formatPercent = (val, decimals = 1) => {
  if (val == null || isNaN(val)) return '—';
  return `%${new Intl.NumberFormat('tr-TR', { maximumFractionDigits: decimals }).format(val * 100)}`;
};

export const formatRoas = (val) => {
  if (val == null || isNaN(val)) return '—';
  return `${TR_DEC2.format(val)}x`;
};

export const formatDuration = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}d ${s}s`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
};
