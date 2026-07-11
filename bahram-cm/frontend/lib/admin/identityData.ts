import 'server-only';
import { adminFetch } from '@/lib/auth/session';
import type { PageMeta } from './academyTypes';
import type {
  IdentityDashboardStats,
  IdentityProviderConfig,
  IdentityRouteConfig,
  IdentityVerificationDetail,
  IdentityVerificationListItem,
} from './identityTypes';

function errorMessage(error: unknown): string {
  const err = error as Error & { status?: number };
  if (err.status === 401) return 'نشست شما منقضی شده. دوباره وارد شوید.';
  if (err.status === 403) return 'اجازه دسترسی به این بخش را ندارید.';
  return 'اتصال به API برقرار نشد.';
}

export async function getIdentityDashboard(): Promise<{
  stats: IdentityDashboardStats | null;
  error: string | null;
}> {
  try {
    const res = await adminFetch<{ data: IdentityDashboardStats }>('/identity-verifications/dashboard');
    return { stats: res.data, error: null };
  } catch {
    // Stats endpoint may be nested on list response; fall back to empty.
    try {
      const res = await adminFetch<{ stats?: IdentityDashboardStats }>('/identity-verifications', {
        query: { per_page: 1 },
      });
      return {
        stats: res.stats ?? {
          pending_review: 0,
          needs_correction: 0,
          ownership_locked: 0,
        },
        error: null,
      };
    } catch (e) {
      return { stats: null, error: errorMessage(e) };
    }
  }
}

export async function getIdentityVerifications(params: {
  status?: string;
  ownership_locked?: string;
  search?: string;
  page?: number;
} = {}): Promise<{
  items: IdentityVerificationListItem[];
  meta: PageMeta | null;
  stats: IdentityDashboardStats | null;
  error: string | null;
}> {
  try {
    const res = await adminFetch<{
      data: IdentityVerificationListItem[];
      meta: PageMeta;
      stats?: IdentityDashboardStats;
    }>('/identity-verifications', {
      query: {
        status: params.status,
        ownership_locked: params.ownership_locked,
        search: params.search,
        page: params.page,
        per_page: 30,
      },
    });
    return {
      items: res.data ?? [],
      meta: res.meta ?? null,
      stats: res.stats ?? null,
      error: null,
    };
  } catch (e) {
    return { items: [], meta: null, stats: null, error: errorMessage(e) };
  }
}

export async function getIdentityVerification(
  id: number,
): Promise<{ item: IdentityVerificationDetail | null; error: string | null }> {
  try {
    const res = await adminFetch<{ data: IdentityVerificationDetail }>(`/identity-verifications/${id}`);
    return { item: res.data, error: null };
  } catch (e) {
    return { item: null, error: errorMessage(e) };
  }
}

type IdentityProviderSettingsResponse = {
  data: {
    providers?: IdentityProviderConfig[];
    routes?: IdentityRouteConfig[];
  };
};

export async function fetchIdentityProviderSettings(): Promise<{
  providers: IdentityProviderConfig[];
  routes: IdentityRouteConfig[];
  error: string | null;
}> {
  try {
    const res = await adminFetch<IdentityProviderSettingsResponse>('/identity-providers');
    return {
      providers: res.data?.providers ?? [],
      routes: res.data?.routes ?? [],
      error: null,
    };
  } catch (e) {
    return { providers: [], routes: [], error: errorMessage(e) };
  }
}

export async function getIdentityProviders(): Promise<{
  items: IdentityProviderConfig[];
  error: string | null;
}> {
  const { providers, error } = await fetchIdentityProviderSettings();
  return { items: providers, error };
}

export async function getIdentityRoutes(): Promise<{
  items: IdentityRouteConfig[];
  error: string | null;
}> {
  const { routes, error } = await fetchIdentityProviderSettings();
  return { items: routes, error };
}
