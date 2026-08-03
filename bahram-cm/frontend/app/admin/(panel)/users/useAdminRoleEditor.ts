'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { assignAdminRoleAction } from '../access/actions';
import type { AdminRole, AdminUserRow } from '@/lib/admin/accessTypes';
import { blurActiveElement } from '@/lib/admin/blurActiveElement';

function sameRoles(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((role, index) => role === sortedB[index]);
}

export function useAdminRoleEditor({
  admin,
  roles,
  viewerIsSuperAdmin = false,
  onRolesSaved,
}: {
  admin: AdminUserRow;
  roles: AdminRole[];
  viewerIsSuperAdmin?: boolean;
  onRolesSaved?: (roles: string[]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(admin.roles);
  const [savedRoles, setSavedRoles] = useState<string[]>(admin.roles);

  useEffect(() => {
    setSelected(admin.roles);
    setSavedRoles(admin.roles);
  }, [admin.id, admin.roles.join('|')]);

  const options = useMemo(
    () =>
      roles.filter((r) => {
        if (r.name !== 'super-admin') return true;
        return viewerIsSuperAdmin || admin.roles.includes('super-admin');
      }),
    [roles, viewerIsSuperAdmin, admin.roles],
  );

  const disabled = pending || !admin.can_assign_role || admin.is_root_admin;
  const dirty = !sameRoles(selected, savedRoles);
  const canSave = !disabled && dirty;

  function toggleRole(roleName: string) {
    if (disabled) return;
    setSelected((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName],
    );
    setError(null);
  }

  function saveRoles() {
    if (selected.length === 0) {
      setError('حداقل یک نقش باید انتخاب شود.');
      return;
    }

    const labels = selected
      .map((name) => options.find((r) => r.name === name)?.label ?? name)
      .join('، ');

    blurActiveElement();
    if (!window.confirm(`نقش‌های «${labels}» برای ${admin.name} اعمال شود؟`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const res = await assignAdminRoleAction(admin.id, selected);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedRoles(selected);
      onRolesSaved?.(selected);
    });
  }

  return {
    admin,
    options,
    selected,
    disabled,
    dirty,
    canSave,
    pending,
    error,
    toggleRole,
    saveRoles,
  };
}

export type AdminRoleEditor = ReturnType<typeof useAdminRoleEditor>;
