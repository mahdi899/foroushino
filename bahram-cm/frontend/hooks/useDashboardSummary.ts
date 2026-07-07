'use client';

import useSWR from 'swr';
import { EMPTY_DASHBOARD_SUMMARY, type DashboardSummary } from '@/lib/admin/dashboardTypes';

const SWR_KEY = 'admin-dashboard-summary';

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch('/api/admin/dashboard/summary', { cache: 'no-store' });
  const json = (await res.json()) as { data?: DashboardSummary; error?: string };

  if (!res.ok) {
    throw new Error(json.error || 'بارگذاری داشبورد ناموفق بود');
  }

  return json.data ?? EMPTY_DASHBOARD_SUMMARY;
}

/**
 * Dashboard-only SWR cache — does not touch articles, SEO, purchase, or chatbot runtime.
 * Refreshes on focus + every 30s while the dashboard is open (operator queue counts).
 */
export function useDashboardSummary() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(SWR_KEY, fetchDashboardSummary, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 30_000,
    dedupingInterval: 4_000,
    keepPreviousData: true,
    fallbackData: EMPTY_DASHBOARD_SUMMARY,
  });

  const loadError = error instanceof Error ? error.message : error ? String(error) : null;

  return {
    stats: data ?? EMPTY_DASHBOARD_SUMMARY,
    loading: isLoading && !data,
    validating: isValidating,
    error: loadError,
    refresh: () => mutate(),
  };
}
