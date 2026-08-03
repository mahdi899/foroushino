'use client';

import { Loader2 } from 'lucide-react';
import type { AdminUserRow } from '@/lib/admin/accessTypes';
import { AdminDeleteButton } from './AdminDeleteButton';
import type { AdminRoleEditor } from './useAdminRoleEditor';

export function AdminUserActionStack({
  editor,
  admin,
  showDelete = true,
}: {
  editor: AdminRoleEditor;
  admin: AdminUserRow;
  showDelete?: boolean;
}) {
  const { canSave, pending, saveRoles } = editor;

  return (
    <div className="flex min-w-[5.5rem] flex-col items-center gap-2">
      {canSave ? (
        <button
          type="button"
          disabled={pending}
          onClick={saveRoles}
          className="btn btn-primary inline-flex min-h-9 items-center justify-center gap-1 px-3 text-caption"
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'ذخیره'}
        </button>
      ) : null}
      {showDelete ? <AdminDeleteButton admin={admin} centered /> : null}
    </div>
  );
}
