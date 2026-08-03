'use client';

import type { AdminRole, AdminUserRow } from '@/lib/admin/accessTypes';
import { displayAdminEmail } from '@/lib/admin/maskEmail';
import { AdminTableCard } from '@/components/admin/layout/AdminTableCard';
import { AdminRoleCheckboxPanel } from './AdminRoleCheckboxPanel';
import { AdminUserActionStack } from './AdminUserActionStack';
import { RoleBadges } from './RoleBadges';
import { useAdminRoleEditor } from './useAdminRoleEditor';

export function AdminUserMobileCard({
  admin,
  roles,
  viewerIsSuperAdmin,
  canViewEmail,
  showDeleteColumn,
  onRolesSaved,
}: {
  admin: AdminUserRow;
  roles: AdminRole[];
  viewerIsSuperAdmin: boolean;
  canViewEmail: boolean;
  showDeleteColumn: boolean;
  onRolesSaved: (roles: string[]) => void;
}) {
  const editor = useAdminRoleEditor({
    admin,
    roles,
    viewerIsSuperAdmin,
    onRolesSaved,
  });

  return (
    <AdminTableCard
      title={admin.name}
      fields={[
        {
          label: 'موبایل',
          value: admin.mobile ?? '—',
          mono: true,
        },
        {
          label: 'ایمیل',
          value: displayAdminEmail(admin.email, canViewEmail),
          mono: true,
        },
        {
          label: 'نقش فعلی',
          value: <RoleBadges roles={admin.roles} roleCatalog={roles} />,
        },
      ]}
      footer={
        <div className="flex w-full flex-col gap-3">
          <AdminRoleCheckboxPanel editor={editor} />
          <div className="flex justify-center">
            <AdminUserActionStack editor={editor} admin={admin} showDelete={showDeleteColumn} />
          </div>
        </div>
      }
    />
  );
}
