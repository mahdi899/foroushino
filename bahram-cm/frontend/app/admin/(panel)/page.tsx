import { adminFetch } from '@/lib/auth/session';
import { normalizeDashboardSummary, type DashboardSummary } from '@/lib/admin/dashboardTypes';
import { AdminDashboardClient } from './AdminDashboardClient';

async function loadDashboardSummary(): Promise<DashboardSummary | undefined> {
  try {
    const res = await adminFetch<{ data: DashboardSummary }>('/analytics/summary');
    return normalizeDashboardSummary(res.data);
  } catch {
    return undefined;
  }
}

/** Summary stats are server-fetched for instant paint; SWR revalidates in the background. */
export default async function AdminDashboard() {
  const initialStats = await loadDashboardSummary();

  return <AdminDashboardClient initialStats={initialStats} />;
}
