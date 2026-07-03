// Format money with BOOKED/CASH pill, negatives in coral parentheses, tabular figures
export function formatMoney(value, opts = {}) {
  if (value == null || isNaN(value)) return '—';
  const num = Number(value);
  const abs = Math.abs(num);
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num < 0) return `(${formatted})`;
  return formatted;
}

export function formatMoneyShort(value) {
  if (value == null || isNaN(value)) return '—';
  const num = Number(value);
  const abs = Math.abs(num);
  let formatted;
  if (abs >= 1_000_000) formatted = (abs / 1_000_000).toFixed(1) + 'M';
  else if (abs >= 1_000) formatted = (abs / 1_000).toFixed(1) + 'K';
  else formatted = abs.toFixed(0);
  if (num < 0) return `(${formatted})`;
  return formatted;
}

export function formatNumber(value) {
  if (value == null || isNaN(value)) return '—';
  return Number(value).toLocaleString('en-US');
}

export function formatPct(value, decimals = 1) {
  if (value == null || isNaN(value)) return '—';
  return Number(value).toFixed(decimals) + '%';
}

export function isNegative(value) {
  return value != null && Number(value) < 0;
}