/** Public-facing view count multiplier (real views stay in DB / manager panel). */
export const FAMILY_VIEW_DISPLAY_MULTIPLIER = 2.3;

export function displayPostViews(realViews: number): number {
  if (realViews <= 0) return 0;
  return Math.round(realViews * FAMILY_VIEW_DISPLAY_MULTIPLIER);
}

/** Compact count like Telegram: 1753 → 1.7K, 1000 → 1K */
export function formatCompactViewCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return '0';
  if (count < 1000) return String(count);

  if (count < 1_000_000) {
    const tenths = Math.floor(count / 100);
    const whole = Math.floor(tenths / 10);
    const frac = tenths % 10;
    return frac === 0 ? `${whole}K` : `${whole}.${frac}K`;
  }

  const tenths = Math.floor(count / 100_000);
  const whole = Math.floor(tenths / 10);
  const frac = tenths % 10;
  return frac === 0 ? `${whole}M` : `${whole}.${frac}M`;
}
