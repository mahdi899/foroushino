import 'server-only';

import { unstable_noStore } from 'next/cache';
import { getPublicPerfConfig } from './public';

export type StaticPageCacheState = {
  enabled: boolean;
  homeTtl: number;
};

/**
 * Public RSC pages call this first — respects admin page_cache / developer_mode.
 * When disabled, opts out of Full Route Cache for that request tree.
 */
export async function ensureStaticPageCache(): Promise<StaticPageCacheState> {
  const cfg = await getPublicPerfConfig();

  if (cfg.developer_mode || cfg.page_cache === false) {
    unstable_noStore();
    return { enabled: false, homeTtl: 0 };
  }

  return { enabled: true, homeTtl: cfg.ttls.home };
}
