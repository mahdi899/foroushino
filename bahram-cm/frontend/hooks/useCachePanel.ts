'use client';

import useSWR from 'swr';
import {
  DEFAULT_CACHE_SETTINGS,
  type CacheSettings,
  type CacheStatus,
} from '@/lib/cache/types';

export type CachePanelResponse = {
  status?: CacheStatus;
  settings?: Partial<CacheSettings>;
  error?: string;
};

async function fetchCachePanel(): Promise<{
  status: CacheStatus;
  settings: CacheSettings;
  backendOk: boolean;
  backendError: string | null;
}> {
  const res = await fetch('/api/admin/cache/panel', { cache: 'no-store' });
  const json = (await res.json()) as CachePanelResponse;

  if (!res.ok) {
    throw new Error(json.error || 'اتصال به Laravel برقرار نیست');
  }

  const fallbackStatus: CacheStatus = {
    laravel_cache_driver: 'نامشخص',
    next_webhook_configured: false,
    cdn_provider: 'none',
    cdn_provider_label: 'غیرفعال',
    cdn_configured: false,
    arvan_configured: false,
    cloudflare_configured: false,
    developer_mode: false,
    cloudflare_dev_mode: null,
    modules: {
      page_cache: true,
      object_cache: true,
      browser_cache: true,
      cdn_html_cache: false,
      cdn_auto_purge: false,
    },
    isr_tags: [],
    isr_ttls: {},
    purge_log: [],
  };

  return {
    status: { ...fallbackStatus, ...(json.status ?? {}) },
    settings: { ...DEFAULT_CACHE_SETTINGS, ...(json.settings ?? {}) },
    backendOk: true,
    backendError: null,
  };
}

/** Client-side cached cache panel — stale-while-revalidate on tab focus. */
export function useCachePanel() {
  const { data, error, isLoading, isValidating, mutate } = useSWR('admin-cache-panel', fetchCachePanel, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
    keepPreviousData: true,
  });

  const loadError = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    status: data?.status,
    settings: data?.settings,
    backendOk: data?.backendOk ?? false,
    backendError: data?.backendError ?? loadError,
    loading: isLoading && !data,
    validating: isValidating,
    refresh: () => mutate(),
    mutate,
  };
}
