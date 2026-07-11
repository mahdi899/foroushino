'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { assignAdminRoleAction } from '../access/actions';
import type { AdminRole } from '@/lib/admin/accessTypes';
import type { AdminUserRow } from '@/lib/admin/accessTypes';

export function AdminRoleSelect({
  admin,
  roles,
}: {
  admin: AdminUserRow;
  roles: AdminRole[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = admin.roles[0] ?? '';

  return (
    <div className="flex flex-col gap-1">
      <select
        className="field-input py-1.5 text-caption"
        defaultValue={current}
        disabled={pending || admin.is_super_admin}
        onChange={(e) => {
          const role = e.target.value;
          if (!role || role === current) return;
          if (!window.confirm(`نقش «${role}» برای ${admin.name} اعمال شود؟`)) {
            e.target.value = current;
            return;
          }
          setError(null);
          startTransition(async () => {
            const res = await assignAdminRoleAction(admin.id, role);
            if (!res.ok) {
              setError(res.error);
              e.target.value = current;
              return;
            }
            router.refresh();
          });
        }}
      >
        {roles.map((r) => (
          <option key={r.id} value={r.name}>
            {r.label}
          </option>
        ))}
      </select>
      {pending ? (
        <span className="inline-flex items-center gap-1 text-caption text-text-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> در حال ذخیره…
        </span>
      ) : null}
      {error ? <span className="text-caption text-error">{error}</span> : null}
      {admin.is_super_admin ? (
        <span className="text-caption text-text-muted">مدیر کل — نقش ثابت</span>
      ) : null}
    </div>
  );
}
