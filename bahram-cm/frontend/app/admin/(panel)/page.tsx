import { AdminDashboardClient } from './AdminDashboardClient';

/** Shell is static; summary stats load client-side via SWR (dashboard-only). */
export default function AdminDashboard() {
  return <AdminDashboardClient />;
}
