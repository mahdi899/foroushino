'use client';

import type { AdminRole, AdminUserRow } from '@/lib/admin/accessTypes';
import { displayAdminEmail } from '@/lib/admin/maskEmail';
import { AdminRoleCheckboxPanel } from './AdminRoleCheckboxPanel';
import { AdminUserActionStack } from './AdminUserActionStack';
import { RoleBadges } from './RoleBadges';
import { useAdminRoleEditor } from './useAdminRoleEditor';

export function AdminUserTableRow({
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
    <tr className="hover:bg-surface-soft/40">
      <td className="px-4 py-3 font-medium text-text">{admin.name}</td>
      <td className="px-4 py-3 text-text-muted" dir="ltr">
        {admin.mobile ?? '—'}
      </td>
      <td className="px-4 py-3 text-text-muted" dir="ltr" title={canViewEmail ? admin.email : undefined}>
        {displayAdminEmail(admin.email, canViewEmail)}
      </td>
      <td className="px-4 py-3">
        <RoleBadges roles={admin.roles} roleCatalog={roles} />
      </td>
      <td className="px-4 py-3 align-top">
        <div className="w-full max-w-[12.5rem]">
          <AdminRoleCheckboxPanel editor={editor} />
          {!showDeleteColumn ? (
            <div className="mt-2">
              <AdminUserActionStack editor={editor} admin={admin} showDelete={false} />
            </div>
          ) : null}
        </div>
      </td>
      {showDeleteColumn ? (
        <td className="px-4 py-3 align-middle text-center">
          <div className="inline-flex justify-center">
            <AdminUserActionStack editor={editor} admin={admin} />
          </div>
        </td>
      ) : null}
    </tr>
  );
}
