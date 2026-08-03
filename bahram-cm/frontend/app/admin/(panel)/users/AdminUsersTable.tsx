'use client';

import { useCallback, useState } from 'react';
import { Table } from '../ui';
import type { AdminRole, AdminUserRow } from '@/lib/admin/accessTypes';
import { AdminUserMobileCard } from './AdminUserMobileCard';
import { AdminUserTableRow } from './AdminUserTableRow';

export function AdminUsersTable({
  initialAdmins,
  roles,
  viewerIsSuperAdmin,
  canViewEmail,
  showDeleteColumn,
}: {
  initialAdmins: AdminUserRow[];
  roles: AdminRole[];
  viewerIsSuperAdmin: boolean;
  canViewEmail: boolean;
  showDeleteColumn: boolean;
}) {
  const [admins, setAdmins] = useState(initialAdmins);

  const handleRolesSaved = useCallback((adminId: number, nextRoles: string[]) => {
    setAdmins((prev) =>
      prev.map((admin) => (admin.id === adminId ? { ...admin, roles: nextRoles } : admin)),
    );
  }, []);

  const tableHead = showDeleteColumn
    ? ['نام', 'موبایل', 'ایمیل', 'نقش فعلی', 'تخصیص نقش', 'حذف']
    : ['نام', 'موبایل', 'ایمیل', 'نقش فعلی', 'تخصیص نقش'];

  const rowProps = {
    roles,
    viewerIsSuperAdmin,
    canViewEmail,
    showDeleteColumn,
  };

  return (
    <div className="min-w-0 max-w-full">
      <Table
        stackBelow="lg"
        head={tableHead}
        mobile={admins.map((admin) => (
          <AdminUserMobileCard
            key={admin.id}
            admin={admin}
            {...rowProps}
            onRolesSaved={(nextRoles) => handleRolesSaved(admin.id, nextRoles)}
          />
        ))}
      >
        {admins.map((admin) => (
          <AdminUserTableRow
            key={admin.id}
            admin={admin}
            {...rowProps}
            onRolesSaved={(nextRoles) => handleRolesSaved(admin.id, nextRoles)}
          />
        ))}
      </Table>
    </div>
  );
}
