'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trash2 } from 'lucide-react';
import { deleteAdminAction } from '../access/actions';
import type { AdminUserRow } from '@/lib/admin/accessTypes';

export function AdminDeleteButton({
  admin,
  canManage,
}: {
  admin: AdminUserRow;
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!canManage || admin.is_super_admin) {
    return <span className="text-caption text-text-muted">—</span>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`مدیر «${admin.name}» حذف شود؟ این عمل قابل بازگشت نیست.`)) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const res = await deleteAdminAction(admin.id);
            if (!res.ok) {
              setError(res.error);
              return;
            }
            router.refresh();
          });
        }}
        className="btn btn-secondary inline-flex min-h-9 items-center gap-1.5 px-2.5 text-caption text-error hover:border-error/40 hover:bg-error/10"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        حذف
      </button>
      {error ? <span className="text-caption text-error">{error}</span> : null}
    </div>
  );
}
