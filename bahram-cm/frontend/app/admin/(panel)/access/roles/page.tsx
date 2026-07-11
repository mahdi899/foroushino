import { AdminPage } from '../../ui';
import { getRoles } from '@/lib/admin/accessData';
import { can, getCurrentUser } from '@/lib/auth/session';
import { RolePermissionsEditor } from './RolePermissionsEditor';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  const user = await getCurrentUser();
  const { roles, permissionGroups, error } = await getRoles();
  const canManage = can(user, 'roles.manage') || can(user, 'permissions.manage');

  return (
    <AdminPage
      icon="KeyRound"
      headerVariant="settings"
      title="نقش‌ها و دسترسی‌ها"
      desc="تعریف دسترسی هر نقش بر اساس ماژول‌های سیستم"
    >
      {error ? (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error}
        </div>
      ) : null}

      <RolePermissionsEditor roles={roles} permissionGroups={permissionGroups} canManage={canManage} />
    </AdminPage>
  );
}
