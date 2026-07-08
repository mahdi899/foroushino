import 'server-only';
import { adminFetch } from '@/lib/auth/session';
import type {
  AdminAudienceSegment,
  AdminCashbackPayout,
  AdminCashbackPayoutRevealed,
  AdminCourseAccess,
  AdminNotification,
  AdminReferralCode,
  AdminReferralConversion,
  AdminSatApplication,
  AdminSeminar,
  AdminSeminarDetail,
  AdminSmsLog,
  AdminStudent,
  AdminStudentDetail,
  AdminTicket,
  AdminTicketDetail,
  AdminTicketReport,
  AdminTicketUserGroup,
  PageMeta,
} from './academyTypes';

function errorMessage(error: unknown): string {
  const err = error as Error & { status?: number };
  if (err.status === 401) {
    return 'نشست شما منقضی شده. از پنل خارج شوید و دوباره وارد شوید.';
  }
  return 'اتصال به API برقرار نشد. مطمئن شوید سرور لاراول در حال اجراست.';
}

export async function getStudents(params: { search?: string; status?: string; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminStudent[]; meta: PageMeta }>('/students', {
      query: { search: params.search, status: params.status, page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminStudent[], meta: null, error: errorMessage(e) };
  }
}

export async function getStudent(id: number): Promise<AdminStudentDetail | null> {
  try {
    const res = await adminFetch<{ data: AdminStudentDetail }>(`/students/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getCourseAccesses(params: { page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminCourseAccess[]; meta: PageMeta }>('/course-accesses', {
      query: { page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminCourseAccess[], meta: null, error: errorMessage(e) };
  }
}

export async function getSeminars() {
  try {
    const res = await adminFetch<{ data: AdminSeminar[] }>('/seminars');
    return { items: res.data, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminSeminar[], error: errorMessage(e) };
  }
}

export async function getSeminar(id: number): Promise<AdminSeminarDetail | null> {
  try {
    const res = await adminFetch<{ data: AdminSeminarDetail }>(`/seminars/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getReferralConversions(params: { status?: string; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminReferralConversion[]; meta: PageMeta }>('/referrals', {
      query: { status: params.status, page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminReferralConversion[], meta: null, error: errorMessage(e) };
  }
}

export async function getReferralCodes(params: { page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminReferralCode[]; meta: PageMeta }>('/referral-codes', {
      query: { page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminReferralCode[], meta: null, error: errorMessage(e) };
  }
}

export async function getCashbackPayouts(params: { status?: string; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminCashbackPayout[]; meta: PageMeta }>('/cashback-payouts', {
      query: { status: params.status, page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminCashbackPayout[], meta: null, error: errorMessage(e) };
  }
}

export async function getCashbackPayoutRevealed(id: number): Promise<AdminCashbackPayoutRevealed | null> {
  try {
    const res = await adminFetch<{ data: AdminCashbackPayoutRevealed }>(`/cashback-payouts/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getSatApplications(params: { status?: string; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminSatApplication[]; meta: PageMeta }>('/sat-applications', {
      query: { status: params.status, page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminSatApplication[], meta: null, error: errorMessage(e) };
  }
}

export async function getTickets(params: { status?: string; user_id?: number; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminTicket[]; meta: PageMeta }>('/tickets', {
      query: { status: params.status, user_id: params.user_id, page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminTicket[], meta: null, error: errorMessage(e) };
  }
}

export async function getTicket(id: number): Promise<AdminTicketDetail | null> {
  try {
    const res = await adminFetch<{ data: AdminTicketDetail }>(`/tickets/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getTicketUserGroups(params: { search?: string; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminTicketUserGroup[]; meta: PageMeta }>('/tickets/users', {
      query: { search: params.search, page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminTicketUserGroup[], meta: null, error: errorMessage(e) };
  }
}

export async function getTicketReports(params: { from?: string; to?: string; status?: string; department?: string } = {}) {
  try {
    const res = await adminFetch<{ data: AdminTicketReport }>('/tickets/reports', {
      query: { from: params.from, to: params.to, status: params.status, department: params.department },
    });
    return { data: res.data, error: null as string | null };
  } catch (e) {
    return { data: null as AdminTicketReport | null, error: errorMessage(e) };
  }
}

export async function getNotifications(params: { page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminNotification[]; meta: PageMeta }>('/notifications', {
      query: { page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminNotification[], meta: null, error: errorMessage(e) };
  }
}

export async function getAudienceSegments() {
  try {
    const res = await adminFetch<{ data: AdminAudienceSegment[] }>('/sms/segments');
    return { items: res.data, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminAudienceSegment[], error: errorMessage(e) };
  }
}

export async function getSmsLogs(params: { status?: string; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminSmsLog[]; meta: PageMeta }>('/sms/logs', {
      query: { status: params.status, page: params.page },
    });
    return { items: res.data, meta: res.meta, error: null as string | null };
  } catch (e) {
    return { items: [] as AdminSmsLog[], meta: null, error: errorMessage(e) };
  }
}
