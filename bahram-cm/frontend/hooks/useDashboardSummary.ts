'use client';

import useSWR from 'swr';
import {
  EMPTY_DASHBOARD_SUMMARY,
  normalizeDashboardSummary,
  type DashboardSummary,
} from '@/lib/admin/dashboardTypes';

const SWR_KEY = 'admin-dashboard-summary';

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch('/api/admin/dashboard/summary', { cache: 'no-store' });
  const json = (await res.json()) as { data?: DashboardSummary; error?: string };

  if (!res.ok) {
    throw new Error(json.error || 'بارگذاری داشبورد ناموفق بود');
  }

  return json.data ? normalizeDashboardSummary(json.data) : EMPTY_DASHBOARD_SUMMARY;
}

/**
 * Dashboard-only SWR cache — does not touch articles, SEO, purchase, or chatbot runtime.
 * Refreshes on focus + every 60s while the tab is visible.
 */
export function useDashboardSummary(initialData?: DashboardSummary) {
  const hasInitialData = initialData !== undefined;

  const { data, error, isLoading, isValidating, mutate } = useSWR(SWR_KEY, fetchDashboardSummary, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: () => (typeof document !== 'undefined' && document.hidden ? 0 : 60_000),
    dedupingInterval: 8_000,
    keepPreviousData: true,
    fallbackData: initialData ?? EMPTY_DASHBOARD_SUMMARY,
    revalidateOnMount: hasInitialData ? true : undefined,
  });

  const loadError = error instanceof Error ? error.message : error ? String(error) : null;
  const stats = data ?? initialData ?? EMPTY_DASHBOARD_SUMMARY;

  return {
    stats,
    loading: isLoading && initialData === undefined,
    validating: isValidating,
    error: loadError,
    refresh: () => mutate(),
  };
}
