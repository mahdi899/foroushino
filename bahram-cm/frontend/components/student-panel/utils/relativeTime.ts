const UNITS: { limit: number; divisor: number; label: string }[] = [
  { limit: 60, divisor: 1, label: 'ثانیه' },
  { limit: 3600, divisor: 60, label: 'دقیقه' },
  { limit: 86400, divisor: 3600, label: 'ساعت' },
  { limit: 604800, divisor: 86400, label: 'روز' },
  { limit: 2592000, divisor: 604800, label: 'هفته' },
  { limit: Infinity, divisor: 2592000, label: 'ماه' },
];

export function formatRelativeTimeFa(dateStr: string | null): string {
  if (!dateStr) return '—';
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
  for (const { limit, divisor, label } of UNITS) {
    if (diffSec < limit) {
      const value = Math.max(1, Math.floor(diffSec / divisor));
      return `${value.toLocaleString('fa-IR')} ${label} پیش`;
    }
  }
  return '—';
}
