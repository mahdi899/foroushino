import { AdminPage } from '../ui';
import { getAdminUsers, getRoles } from '@/lib/admin/accessData';
import { can, getCurrentUser, isSuperAdmin } from '@/lib/auth/session';
import { AdminUsersTable } from './AdminUsersTable';
import { CreateAdminForm } from './CreateAdminForm';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  const viewerIsSuperAdmin = isSuperAdmin(user);
  const canViewEmail = can(user, 'admins.view_email');
  const canCreate = can(user, 'admins.create');
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
        <AdminUsersTable
          key={admins.map((admin) => admin.id).join('-')}
          initialAdmins={admins}
          roles={roles}
          viewerIsSuperAdmin={viewerIsSuperAdmin}
          canViewEmail={canViewEmail}
          showDeleteColumn={showDeleteColumn}
        />
      ) : (
        <div className="card p-8 text-center text-small text-text-muted">
          مدیری یافت نشد یا دسترسی مشاهده نقش‌ها را ندارید.
        </div>
      )}
    </AdminPage>
  );
}
