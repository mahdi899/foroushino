'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch, can, getCurrentUser, isSuperAdmin } from '@/lib/auth/session';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & {
    payload?: {
      error?: { message_fa?: string; details?: Record<string, string[]> };
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  const details = err.payload?.error?.details ?? err.payload?.errors;
  const field = details ? Object.values(details)[0]?.[0] : undefined;
  return {
    ok: false,
    error: err.payload?.error?.message_fa ?? field ?? err.payload?.message ?? fallback,
  };
}

export async function assignAdminRoleAction(
  adminId: number,
  roles: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!can(user, 'admins.assign_role')) {
    return { ok: false, error: 'دسترسی تغییر نقش مدیران را ندارید.' };
  }

  if (roles.length === 0) {
    return { ok: false, error: 'حداقل یک نقش باید انتخاب شود.' };
  }

  try {
    await adminFetch(`/roles/admins/${adminId}`, {
      method: 'PATCH',
      body: { roles, confirm: true },
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
  confirm_promote?: boolean;
}): Promise<
  | { ok: true; name: string }
  | { ok: false; error: string }
  | { ok: false; needsPromoteConfirm: true; message: string }
> {
  const user = await getCurrentUser();
  if (!can(user, 'admins.create')) {
    return { ok: false, error: 'دسترسی افزودن مدیر را ندارید.' };
  }

  try {
    const res = await adminFetch<{ data: { name: string } }>('/roles/admins', {
      method: 'POST',
      body: {
        name: input.name,
        email: input.email,
        mobile: input.mobile,
        password: input.password,
        role: input.role,
        ...(input.confirm_promote ? { confirm_promote: true } : {}),
      },
    });
    revalidatePath('/admin/users');
    revalidatePath('/admin/access/roles');
    return { ok: true, name: res.data.name };
  } catch (e) {
    const err = e as Error & {
      payload?: {
        error?: { details?: Record<string, string[]> };
        errors?: Record<string, string[]>;
      };
    };
    const details = err.payload?.error?.details ?? err.payload?.errors;
    const promoteMsg = details?.confirm_promote?.[0];
    if (promoteMsg) {
      return { ok: false, needsPromoteConfirm: true, message: promoteMsg };
    }
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
