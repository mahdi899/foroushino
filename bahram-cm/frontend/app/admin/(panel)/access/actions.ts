'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch, can, getCurrentUser, isSuperAdmin } from '@/lib/auth/session';

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
  const user = await getCurrentUser();
  if (!can(user, 'admins.assign_role')) {
    return { ok: false, error: 'دسترسی تغییر نقش مدیران را ندارید.' };
  }

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

export async function createAdminAction(input: {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: string;
}): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!can(user, 'admins.create')) {
    return { ok: false, error: 'دسترسی افزودن مدیر را ندارید.' };
  }

  try {
    const res = await adminFetch<{ data: { name: string } }>('/roles/admins', {
      method: 'POST',
      body: input,
    });
    revalidatePath('/admin/users');
    revalidatePath('/admin/access/roles');
    return { ok: true, name: res.data.name };
  } catch (e) {
    return actionError(e, 'ساخت مدیر جدید ناموفق بود.');
  }
}

export async function updateRolePermissionsAction(
  roleId: number,
  permissions: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) {
    return { ok: false, error: 'فقط مدیر کل می‌تواند دسترسی‌های نقش را ویرایش کند.' };
  }

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

export async function deleteAdminAction(adminId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!can(user, 'admins.delete')) {
    return { ok: false, error: 'دسترسی حذف مدیران را ندارید.' };
  }

  try {
    await adminFetch(`/roles/admins/${adminId}`, { method: 'DELETE' });
    revalidatePath('/admin/users');
    revalidatePath('/admin/access/roles');
    return { ok: true };
  } catch (e) {
    return actionError(e, 'حذف مدیر ناموفق بود.');
  }
}
