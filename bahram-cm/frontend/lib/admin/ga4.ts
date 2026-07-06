export interface Ga4DashboardData {
  configured: boolean;
  error?: string;
  property_id?: string;
  period_days: number;
  totals: {
    active_users: number;
    sessions: number;
    page_views: number;
    engagement_rate: number;
  };
  daily_sessions: { date: string; sessions: number }[];
  top_pages: { path: string; views: number }[];
  top_events: { name: string; count: number }[];
}

export const EMPTY_GA4_DASHBOARD: Ga4DashboardData = {
  configured: false,
  period_days: 28,
  totals: { active_users: 0, sessions: 0, page_views: 0, engagement_rate: 0 },
  daily_sessions: [],
  top_pages: [],
  top_events: [],
};
