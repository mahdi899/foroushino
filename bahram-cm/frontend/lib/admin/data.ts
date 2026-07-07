import 'server-only';
import { adminFetch } from '@/lib/auth/session';
import { EMPTY_DASHBOARD_SUMMARY, type DashboardSummary } from './dashboardTypes';
import { EMPTY_GA4_DASHBOARD, type Ga4DashboardData } from './ga4';

export type { DashboardChatbotStats, DashboardRecentLead, DashboardSummary } from './dashboardTypes';

const EMPTY_SUMMARY = EMPTY_DASHBOARD_SUMMARY;

export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const res = await adminFetch<{ data: DashboardSummary }>('/analytics/summary');
    return res.data;
  } catch {
    return EMPTY_SUMMARY;
  }
}

export interface AdminLead {
  id: number;
  name: string;
  phone: string;
  treatment_tags: string | string[] | null;
  selection?: Record<string, unknown> | null;
  preferred_contact?: string | null;
  budget_pref?: string | null;
  best_call_time?: string | null;
  source: string | null;
  form_type: string | null;
  page_url?: string | null;
  status: { name: string; label: string; color: string } | null;
  campaign: string | null;
  created_at: string;
  utm?: { source?: string | null; medium?: string | null; campaign?: string | null } | null;
  answers?: { question_key: string; answer_value: string }[];
  notes?: { id: number; note: string; created_at: string }[];
  media?: { id: number; view_url?: string | null; url?: string | null; mime?: string | null }[];
}

export async function getLeads(filter?: { status?: string; form_type?: string }): Promise<AdminLead[]> {
  try {
    const res = await adminFetch<{ data: AdminLead[] }>('/leads', {
      query: { 'filter[status]': filter?.status, 'filter[form_type]': filter?.form_type, per_page: 100 },
    });
    return res.data;
  } catch {
    return [];
  }
}

export async function getLead(id: number): Promise<AdminLead | null> {
  try {
    const res = await adminFetch<{ data: AdminLead }>(`/leads/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export interface ReportsData {
  total_events: number;
  leads: number;
  consultations: number;
  conversion_rate: number;
  by_event: { type: string; count: number }[];
  by_source: { source: string; count: number }[];
}

export async function getReports(): Promise<ReportsData> {
  try {
    const res = await adminFetch<{ data: ReportsData }>('/analytics/reports');
    return res.data;
  } catch {
    return { total_events: 0, leads: 0, consultations: 0, conversion_rate: 0, by_event: [], by_source: [] };
  }
}

export async function getGa4Dashboard(days = 28): Promise<Ga4DashboardData> {
  try {
    const res = await adminFetch<{ data: Ga4DashboardData }>(`/analytics/ga4?days=${days}`);
    return res.data;
  } catch {
    return { ...EMPTY_GA4_DASHBOARD, error: 'اتصال به GA4 برقرار نشد.' };
  }
}

export interface AuditEntry {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  created_at: string;
}

export async function getAuditLogs(): Promise<AuditEntry[]> {
  try {
    const res = await adminFetch<{ data: AuditEntry[] }>('/audit-logs');
    return res.data;
  } catch {
    return [];
  }
}
