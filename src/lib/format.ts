// Small formatting helpers shared across the dashboard.

const zar = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  maximumFractionDigits: 0,
});

const zarCents = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatZAR = (n: number, cents = false): string =>
  (cents ? zarCents : zar).format(n);

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('en-ZA').format(n);

export const formatPercent = (n: number, digits = 0): string =>
  `${(n * 100).toFixed(digits)}%`;

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function relativeDays(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.round(ms / 86_400_000);
  if (days === 0) return 'today';
  if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;
  return `${-days} day${days === -1 ? '' : 's'} ago`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
