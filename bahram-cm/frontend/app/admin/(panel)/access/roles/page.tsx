import { AdminPage } from '../../ui';
import { getRoles } from '@/lib/admin/accessData';
import { getCurrentUser, isSuperAdmin } from '@/lib/auth/session';
import { RolePermissionsEditor } from './RolePermissionsEditor';

export const dynamic = 'force-dynamic';

export default async function RolesPage() {
  const user = await getCurrentUser();
  const { roles, permissionGroups, error } = await getRoles();
  const canManage = isSuperAdmin(user);

  return (
    <AdminPage
      icon="Shield"
      headerVariant="settings"
      title="نقش‌ها و دسترسی‌ها"
      desc="تعریف دسترسی هر نقش بر اساس ماژول‌های سیستم — هر بخش با رنگ و آیکن جداگانه"
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
