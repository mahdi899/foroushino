import { SITE_ORIGIN } from '@/lib/api/config';

/** Dev server binds to 0.0.0.0 — normalize so cart/checkout stay on localhost. */
export function normalizeSiteOrigin(origin: string): string {
  return origin.replace(/^http:\/\/0\.0\.0\.0(?=:\d+|$)/, 'http://localhost');
}

export function buildCartUrl(origin?: string): string {
  const base = normalizeSiteOrigin(origin ?? SITE_ORIGIN);
  return `${base.replace(/\/+$/, '')}/cart`;
}
