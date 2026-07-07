export interface DashboardChatbotStats {
  enabled: boolean;
  pending_operator: number;
  sessions: number;
}

export interface DashboardRecentLead {
  id: number;
  name: string;
  phone: string;
  status: string;
  status_label: string;
  created_at: string;
}

export interface DashboardSummary {
  leads: number;
  new_leads: number;
  products: number;
  orders: number;
  pending_orders: number;
  articles: number;
  published_articles: number;
  media: number;
  chatbot: DashboardChatbotStats;
  recent_leads: DashboardRecentLead[];
}

export const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  leads: 0,
  new_leads: 0,
  products: 0,
  orders: 0,
  pending_orders: 0,
  articles: 0,
  published_articles: 0,
  media: 0,
  chatbot: { enabled: false, pending_operator: 0, sessions: 0 },
  recent_leads: [],
};
