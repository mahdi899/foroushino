export interface DashboardChatbotStats {
  enabled: boolean;
  pending_operator: number;
  sessions: number;
}

export interface DashboardAcademyStats {
  students: number;
  active_students: number;
  tickets_open: number;
  tickets_total: number;
  course_accesses_active: number;
  seminars: number;
  upcoming_seminars: number;
  sat_applications_pending: number;
  cashback_payouts_pending: number;
  referral_conversions: number;
  notifications_sent: number;
}

export interface DashboardRecentLead {
  id: number;
  name: string;
  phone: string;
  status: string;
  status_label: string;
  created_at: string;
}

export interface DashboardRecentTicket {
  id: number;
  subject: string;
  student_name: string;
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
  academy: DashboardAcademyStats;
  recent_leads: DashboardRecentLead[];
  recent_tickets: DashboardRecentTicket[];
}

export const EMPTY_DASHBOARD_ACADEMY: DashboardAcademyStats = {
  students: 0,
  active_students: 0,
  tickets_open: 0,
  tickets_total: 0,
  course_accesses_active: 0,
  seminars: 0,
  upcoming_seminars: 0,
  sat_applications_pending: 0,
  cashback_payouts_pending: 0,
  referral_conversions: 0,
  notifications_sent: 0,
};

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
  academy: EMPTY_DASHBOARD_ACADEMY,
  recent_leads: [],
  recent_tickets: [],
};
