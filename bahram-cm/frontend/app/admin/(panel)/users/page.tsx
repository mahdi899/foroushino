import { AdminPage, Badge, Table } from '../ui';
import { getAdminUsers, getRoles } from '@/lib/admin/accessData';
import { displayAdminEmail } from '@/lib/admin/maskEmail';
import { can, getCurrentUser, isSuperAdmin } from '@/lib/auth/session';
import { AdminDeleteButton } from './AdminDeleteButton';
import { AdminRoleSelect } from './AdminRoleSelect';
import { CreateAdminForm } from './CreateAdminForm';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  const viewerIsSuperAdmin = isSuperAdmin(user);
  const canViewEmail = can(user, 'admins.view_email');
  const canCreate = can(user, 'admins.create');
  const canAssignRole = can(user, 'admins.assign_role');
  const canDelete = can(user, 'admins.delete');

  const [{ items: admins, error }, { roles, error: rolesError }] = await Promise.all([
    getAdminUsers(),
    getRoles(),
  ]);

  const showDeleteColumn = canDelete;

  return (
    <AdminPage
      icon="Shield"
      headerVariant="settings"
      title="مدیران"
      desc="مدیریت حساب‌های ادمین — دسترسی‌ها از بخش نقش‌ها و دسترسی‌ها قابل تنظیم است"
    >
      {(error || rolesError) && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error ?? rolesError}
        </div>
      )}

      {canCreate ? <CreateAdminForm roles={roles} isSuperAdmin={viewerIsSuperAdmin} /> : null}

      {admins.length > 0 ? (
        <Table
          head={
            showDeleteColumn
              ? ['نام', 'موبایل', 'ایمیل', 'نقش فعلی', 'تخصیص نقش', 'حذف']
              : ['نام', 'موبایل', 'ایمیل', 'نقش فعلی', 'تخصیص نقش']
          }
        >
          {admins.map((admin) => (
            <tr key={admin.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3 font-medium text-text">
                {admin.name}
                {admin.is_root_admin ? (
                  <span className="mr-2 inline-block">
                    <Badge tone="accent">مدیر اصلی</Badge>
                  </span>
                ) : admin.is_super_admin ? (
                  <span className="mr-2 inline-block">
                    <Badge tone="accent">مدیر کل</Badge>
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-text-muted" dir="ltr">
                {admin.mobile ?? '—'}
              </td>
              <td className="px-4 py-3 text-text-muted" dir="ltr" title={canViewEmail ? admin.email : undefined}>
                {displayAdminEmail(admin.email, canViewEmail)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {admin.roles.length ? (
                    admin.roles.map((r) => (
                      <Badge key={r} tone="default">
                        {roles.find((x) => x.name === r)?.label ?? r}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-caption text-text-muted">بدون نقش</span>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <AdminRoleSelect admin={admin} roles={roles} canManage={canAssignRole} />
              </td>
              {showDeleteColumn ? (
                <td className="px-4 py-3">
                  <AdminDeleteButton admin={admin} />
                </td>
              ) : null}
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-8 text-center text-small text-text-muted">
          مدیری یافت نشد یا دسترسی مشاهده نقش‌ها را ندارید.
        </div>
      )}
    </AdminPage>
  );
}
