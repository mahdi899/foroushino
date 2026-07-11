import { AdminPage, Badge, Table } from '../ui';
import { getAdminUsers, getRoles } from '@/lib/admin/accessData';
import { can, getCurrentUser } from '@/lib/auth/session';
import { AdminRoleSelect } from './AdminRoleSelect';
import { CreateAdminForm } from './CreateAdminForm';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  const canManage = can(user, 'roles.manage') || Boolean(user?.is_super_admin);
  const isSuperAdmin = Boolean(user?.is_super_admin);

  const [{ items: admins, error }, { roles, error: rolesError }] = await Promise.all([
    getAdminUsers(),
    getRoles(),
  ]);

  return (
    <AdminPage
      icon="Shield"
      headerVariant="settings"
      title="مدیران"
      desc="ساخت مدیر جدید با ایمیل و رمز، و تخصیص نقش از بین نقش‌های تعریف‌شده"
    >
      {(error || rolesError) && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error ?? rolesError}
        </div>
      )}

      {canManage ? <CreateAdminForm roles={roles} isSuperAdmin={isSuperAdmin} /> : null}

      {admins.length > 0 ? (
        <Table head={['نام', 'ایمیل', 'نقش فعلی', 'تخصیص نقش']}>
          {admins.map((admin) => (
            <tr key={admin.id} className="hover:bg-surface-soft/40">
              <td className="px-4 py-3 font-medium text-text">
                {admin.name}
                {admin.is_super_admin ? (
                  <span className="mr-2 inline-block">
                    <Badge tone="accent">مدیر کل</Badge>
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-text-muted" dir="ltr">
                {admin.email}
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
                <AdminRoleSelect admin={admin} roles={roles} canManage={canManage} />
              </td>
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
