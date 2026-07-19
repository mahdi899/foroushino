import type { DashboardSummary } from '@/lib/admin/dashboardTypes';

export type AdminNavBadgeCounts = {
  chatbot: number;
  tickets: number;
  referrals: number;
  cashbackPayouts: number;
  satApplications: number;
};

export const EMPTY_ADMIN_NAV_BADGE_COUNTS: AdminNavBadgeCounts = {
  chatbot: 0,
  tickets: 0,
  referrals: 0,
  cashbackPayouts: 0,
  satApplications: 0,
};

/** Map admin nav href → pending queue count for sidebar/mobile blink badges. */
export function adminNavBadgeCountForHref(href: string, counts: AdminNavBadgeCounts): number {
  switch (href) {
    case '/admin/chatbot':
      return counts.chatbot;
    case '/admin/academy/tickets':
      return counts.tickets;
    case '/admin/academy/referrals':
      return counts.referrals;
    case '/admin/academy/cashback-payouts':
      return counts.cashbackPayouts;
    case '/admin/academy/sat-applications':
      return counts.satApplications;
    default:
      return 0;
  }
}

export function hasAnyAdminNavBadge(counts: AdminNavBadgeCounts): boolean {
  return (
    counts.chatbot > 0 ||
    counts.tickets > 0 ||
    counts.referrals > 0 ||
    counts.cashbackPayouts > 0 ||
    counts.satApplications > 0
  );
}

export function buildAdminNavBadgeCountsFromSummary(summary: DashboardSummary): AdminNavBadgeCounts {
  return {
    chatbot: summary.chatbot.pending_operator,
    tickets: summary.academy.tickets_open,
    referrals: summary.academy.referral_conversions_pending,
    cashbackPayouts: summary.academy.cashback_payouts_pending,
    satApplications: summary.academy.sat_applications_pending,
  };
}
