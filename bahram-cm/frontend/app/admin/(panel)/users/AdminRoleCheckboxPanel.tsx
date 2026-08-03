'use client';

import { Check } from 'lucide-react';
import { blurActiveElement } from '@/lib/admin/blurActiveElement';
import { cn } from '@/lib/utils';
import type { AdminRoleEditor } from './useAdminRoleEditor';

export function AdminRoleCheckboxPanel({ editor }: { editor: AdminRoleEditor }) {
  const { admin, options, selected, disabled, error, toggleRole } = editor;

  return (
    <div className="w-full max-w-full">
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
                    onChange={() => {
                      toggleRole(role.name);
                      blurActiveElement();
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate">{role.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {error ? <p className="mt-1 text-[0.68rem] leading-snug text-error">{error}</p> : null}
      {admin.is_root_admin ? (
        <p className="mt-1 text-[0.68rem] text-text-muted">مدیر اصلی — نقش ثابت</p>
      ) : !admin.can_assign_role ? (
        <p className="mt-1 text-[0.68rem] text-text-muted">بدون دسترسی «تغییر نقش مدیر»</p>
      ) : null}
    </div>
  );
}
