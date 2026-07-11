import 'server-only';
import { adminFetch } from '@/lib/auth/session';
import type {
  AdminRole,
  AdminRoleListResponse,
  AdminUserRow,
  AuditLogEntry,
  PermissionGroup,
} from './accessTypes';
import type { PageMeta } from './academyTypes';

function errorMessage(error: unknown): string {
  const err = error as Error & { status?: number };
  if (err.status === 401) return 'نشست شما منقضی شده. دوباره وارد شوید.';
  if (err.status === 403) return 'اجازه دسترسی به این بخش را ندارید.';
  return 'اتصال به API برقرار نشد.';
}

export async function getRoles(): Promise<{
  roles: AdminRole[];
  permissionGroups: PermissionGroup[];
  error: string | null;
}> {
  try {
    const res = await adminFetch<AdminRoleListResponse>('/roles');
    return {
      roles: res.data ?? [],
      permissionGroups: res.permission_groups ?? [],
      error: null,
    };
  } catch (e) {
    return { roles: [], permissionGroups: [], error: errorMessage(e) };
  }
}

export async function getAdminUsers(): Promise<{ items: AdminUserRow[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminUserRow[] }>('/roles/admins');
    return { items: res.data ?? [], error: null };
  } catch (e) {
    return { items: [], error: errorMessage(e) };
  }
}

export async function getAdminAuditLogs(params: {
  action?: string;
  actor_id?: string;
  page?: number;
} = {}): Promise<{ items: AuditLogEntry[]; meta: PageMeta | null; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AuditLogEntry[]; meta: PageMeta }>('/audit-logs', {
      query: {
        action: params.action,
        actor_id: params.actor_id ? Number(params.actor_id) : undefined,
        page: params.page,
        per_page: 50,
      },
    });
    return { items: res.data ?? [], meta: res.meta ?? null, error: null };
  } catch (e) {
    return { items: [], meta: null, error: errorMessage(e) };
  }
}
