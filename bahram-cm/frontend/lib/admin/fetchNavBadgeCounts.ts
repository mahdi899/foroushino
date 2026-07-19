'use client';

import {
  buildAdminNavBadgeCountsFromSummary,
  EMPTY_ADMIN_NAV_BADGE_COUNTS,
  type AdminNavBadgeCounts,
} from '@/lib/admin/navBadges';
import { normalizeDashboardSummary, type DashboardSummary } from '@/lib/admin/dashboardTypes';

export async function fetchAdminNavBadgeCounts(): Promise<AdminNavBadgeCounts> {
  const res = await fetch('/api/admin/dashboard/summary', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to load admin nav badges');
  }

  const json = (await res.json()) as { data?: DashboardSummary };
  if (!json.data) {
    return EMPTY_ADMIN_NAV_BADGE_COUNTS;
  }

  return buildAdminNavBadgeCountsFromSummary(normalizeDashboardSummary(json.data));
}
