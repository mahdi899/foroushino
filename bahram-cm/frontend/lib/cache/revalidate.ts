import { REVALIDATE } from '@/lib/api/config';

export type RevalidateKey = keyof typeof REVALIDATE | 'home';

const DEV_TTL = 30;

const FALLBACK_TTLS: Record<RevalidateKey, number> = {
  articles: REVALIDATE.articles,
  cases: REVALIDATE.cases,
  services: REVALIDATE.services,
  settings: REVALIDATE.settings,
  pricing: REVALIDATE.pricing,
  home: 600,
};

/** ISR TTL — reads admin settings on server; safe static fallback on client bundles. */
export async function getRevalidateSeconds(key: RevalidateKey): Promise<number> {
  if (process.env.NODE_ENV === 'development') return DEV_TTL;

  if (typeof window !== 'undefined') {
    return FALLBACK_TTLS[key];
  }

  const { getPublicPerfConfig } = await import('./public');
  const cfg = await getPublicPerfConfig();
  if (cfg.developer_mode || cfg.page_cache === false) return 0;

  const map: Record<RevalidateKey, number> = {
    articles: cfg.ttls.articles,
    cases: cfg.ttls.cases,
    services: cfg.ttls.services,
    settings: cfg.ttls.settings,
    pricing: cfg.ttls.pricing,
    home: cfg.ttls.home,
  };

  const ttl = map[key];
  return Number.isFinite(ttl) && ttl >= 60 ? ttl : FALLBACK_TTLS[key];
}
