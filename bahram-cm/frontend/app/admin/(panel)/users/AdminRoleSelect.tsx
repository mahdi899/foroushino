'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { assignAdminRoleAction } from '../access/actions';
import type { AdminRole } from '@/lib/admin/accessTypes';
import type { AdminUserRow } from '@/lib/admin/accessTypes';
import { cn } from '@/lib/utils';

function sameRoles(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((role, index) => role === sortedB[index]);
}

export function AdminRoleSelect({
  admin,
  roles,
  viewerIsSuperAdmin = false,
}: {
  admin: AdminUserRow;
  roles: AdminRole[];
  viewerIsSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(admin.roles);

  useEffect(() => {
    setSelected(admin.roles);
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
  const dirty = !sameRoles(selected, admin.roles);

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
      router.refresh();
    });
  }

  return (
    <div className="w-[12.5rem] max-w-full">
      <div className="overflow-hidden rounded-lg border border-border bg-surface-soft/40">
        <div className="flex items-center justify-between border-b border-border/70 px-2 py-1">
          <span className="text-[0.68rem] font-medium text-text-muted">نقش‌ها</span>
          <span className="rounded-full bg-surface px-1.5 py-0.5 text-[0.65rem] tabular-nums text-text-muted">
            {selected.length}/{options.length}
          </span>
        </div>

        <div
          className="max-h-28 overflow-y-auto overscroll-contain px-1 py-1 [scrollbar-width:thin]"
          role="group"
          aria-label="انتخاب نقش‌های مدیر"
        >
          <div className="flex flex-col gap-0.5">
            {options.map((role) => {
              const on = selected.includes(role.name);
              return (
                <label
                  key={role.id}
                  title={role.label}
                  className={cn(
                    'flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-[0.72rem] leading-tight transition',
                    on ? 'bg-accent/12 text-text' : 'text-text-muted hover:bg-surface hover:text-text',
                    disabled && 'cursor-default opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-3.5 w-3.5 shrink-0 place-items-center rounded border transition',
                      on ? 'border-accent bg-accent text-white' : 'border-border/80 bg-surface',
                    )}
                  >
                    {on ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    disabled={disabled}
                    onChange={() => toggleRole(role.name)}
                  />
                  <span className="min-w-0 flex-1 truncate">{role.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {dirty && !disabled ? (
          <div className="border-t border-border/70 p-1">
            <button
              type="button"
              disabled={pending}
              onClick={saveRoles}
              className="btn btn-primary flex min-h-7 w-full items-center justify-center gap-1 px-2 text-[0.7rem]"
            >
              {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'ذخیره'}
            </button>
          </div>
        ) : null}
      </div>

      {pending && !dirty ? (
        <span className="mt-1 inline-flex items-center gap-1 text-[0.68rem] text-text-muted">
          <Loader2 className="h-3 w-3 animate-spin" /> در حال ذخیره…
        </span>
      ) : null}
      {error ? <p className="mt-1 text-[0.68rem] leading-snug text-error">{error}</p> : null}
      {admin.is_root_admin ? (
        <p className="mt-1 text-[0.68rem] text-text-muted">مدیر اصلی — نقش ثابت</p>
      ) : !admin.can_assign_role ? (
        <p className="mt-1 text-[0.68rem] text-text-muted">بدون دسترسی «تغییر نقش مدیر»</p>
      ) : null}
    </div>
  );
}
