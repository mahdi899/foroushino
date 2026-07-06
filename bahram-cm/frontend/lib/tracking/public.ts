import 'server-only';
import { cache } from 'react';
import { PUBLIC_API_URL } from '@/lib/api/config';
import { siteConfig } from '@/config/site';
import { isTrackingViaCloudflare } from './cloudflare';
import type { TrackingPublicConfig } from './types';
import { EMPTY_TRACKING_PUBLIC } from './types';

function envPublicConfig(): TrackingPublicConfig {
  const viaCloudflare = isTrackingViaCloudflare();
  const ga4 = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim() || process.env.GA4_MEASUREMENT_ID?.trim() || '';
  const gtm = process.env.NEXT_PUBLIC_GTM_CONTAINER_ID?.trim() || process.env.GTM_CONTAINER_ID?.trim() || '';
  const verification = process.env.GOOGLE_SITE_VERIFICATION?.trim() || '';
  const indexNow = process.env.INDEXNOW_KEY?.trim() || '';

  return {
    analytics: {
      provider: viaCloudflare ? 'cloudflare' : 'inline',
      enabled: viaCloudflare || Boolean(ga4 || gtm),
      ga4_id: viaCloudflare ? '' : ga4,
      gtm_id: viaCloudflare ? '' : gtm,
      configured: viaCloudflare || Boolean(ga4 || gtm),
    },
    search_console: {
      enabled: Boolean(verification),
      verification_code: verification,
      configured: Boolean(verification),
    },
    indexnow: {
      configured: Boolean(indexNow),
      key: indexNow,
    },
  };
}

export const getPublicTrackingConfig = cache(async (): Promise<TrackingPublicConfig> => {
  try {
    const res = await fetch(`${PUBLIC_API_URL}/tracking/config`, {
      next: { revalidate: 300, tags: ['settings'] },
    });
    if (!res.ok) return envPublicConfig();
    const json = (await res.json()) as { data?: TrackingPublicConfig };
    const data = json.data;
    if (!data) return envPublicConfig();

    const env = envPublicConfig();
    const viaCloudflare = isTrackingViaCloudflare();
    return {
      analytics: {
        provider: viaCloudflare ? 'cloudflare' : data.analytics.provider ?? env.analytics.provider,
        enabled: viaCloudflare ? true : data.analytics.enabled,
        ga4_id: viaCloudflare ? '' : data.analytics.ga4_id || env.analytics.ga4_id,
        gtm_id: viaCloudflare ? '' : data.analytics.gtm_id || env.analytics.gtm_id,
        configured: viaCloudflare || data.analytics.configured || env.analytics.configured,
      },
      search_console: {
        enabled: data.search_console.enabled,
        verification_code: data.search_console.verification_code || env.search_console.verification_code,
        configured: data.search_console.configured || env.search_console.configured,
      },
      indexnow: {
        configured: data.indexnow.configured || env.indexnow.configured,
        key: data.indexnow.key || env.indexnow.key,
      },
    };
  } catch {
    return envPublicConfig();
  }
});

export async function getIndexNowKey(): Promise<string | null> {
  const config = await getPublicTrackingConfig();
  const key = config.indexnow.key?.trim();
  return key || null;
}

export function siteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/+$/, '');
}
