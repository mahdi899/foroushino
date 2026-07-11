'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & {
    payload?: { error?: { message_fa?: string }; message?: string; errors?: Record<string, string[]> };
  };
  const field = err.payload?.errors ? Object.values(err.payload.errors)[0]?.[0] : undefined;
  return {
    ok: false,
    error: err.payload?.error?.message_fa ?? field ?? err.payload?.message ?? fallback,
  };
}

export async function assignAdminRoleAction(
  adminId: number,
  role: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/roles/admins/${adminId}`, {
      method: 'PATCH',
      body: { role, confirm: true },
    });
    revalidatePath('/admin/users');
    revalidatePath('/admin/access/roles');
    return { ok: true };
  } catch (e) {
    return actionError(e, 'تغییر نقش مدیر ناموفق بود.');
  }
}

export async function updateRolePermissionsAction(
  roleId: number,
  permissions: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/roles/${roleId}`, {
      method: 'PATCH',
      body: { permissions },
    });
    revalidatePath('/admin/access/roles');
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره دسترسی‌های نقش ناموفق بود.');
  }
}
