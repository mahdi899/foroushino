import { AdminPage, Badge, Table } from '../ui';
import { getAdminUsers, getRoles } from '@/lib/admin/accessData';
import { AdminRoleSelect } from './AdminRoleSelect';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const [{ items: admins, error }, { roles, error: rolesError }] = await Promise.all([
    getAdminUsers(),
    getRoles(),
  ]);

  return (
    <AdminPage
      icon="Shield"
      headerVariant="settings"
      title="مدیران"
      desc="لیست مدیران و تخصیص نقش — تغییر نقش نیاز به تأیید دارد"
    >
      {(error || rolesError) && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error ?? rolesError}
        </div>
      )}

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
                <AdminRoleSelect admin={admin} roles={roles} />
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
