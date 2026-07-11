'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { updateRolePermissionsAction } from '../actions';
import { MODULE_LABELS_FA, type AdminRole, type PermissionGroup } from '@/lib/admin/accessTypes';

export function RolePermissionsEditor({
  roles,
  permissionGroups,
  canManage,
}: {
  roles: AdminRole[];
  permissionGroups: PermissionGroup[];
  canManage: boolean;
}) {
  const router = useRouter();
  const editable = roles.filter((r) => r.name !== 'super-admin');
  const [selectedId, setSelectedId] = useState(editable[0]?.id ?? roles[0]?.id ?? 0);
  const selected = roles.find((r) => r.id === selectedId) ?? roles[0];
  const [checked, setChecked] = useState<string[]>(selected?.permissions ?? []);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const isSuper = selected?.name === 'super-admin';

  function selectRole(id: number) {
    const role = roles.find((r) => r.id === id);
    setSelectedId(id);
    setChecked(role?.permissions ?? []);
    setMessage(null);
  }

  const grouped = useMemo(() => permissionGroups, [permissionGroups]);

  function toggle(name: string, reserved: boolean) {
    if (!canManage || isSuper || (reserved && !canManage)) return;
    setChecked((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  }

  function save() {
    if (!selected || isSuper || !canManage) return;
    setMessage(null);
    startTransition(async () => {
      const res = await updateRolePermissionsAction(selected.id, checked);
      if (!res.ok) {
        setMessage({ type: 'err', text: res.error });
        return;
      }
      setMessage({ type: 'ok', text: 'دسترسی‌ها ذخیره شد.' });
      router.refresh();
    });
  }

  if (!selected) {
    return <div className="card p-8 text-center text-text-muted">نقشی برای نمایش وجود ندارد.</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
      <aside className="card p-3">
        <p className="mb-2 px-2 text-caption font-medium text-text-muted">نقش‌ها</p>
        <ul className="space-y-0.5">
          {roles.map((role) => (
            <li key={role.id}>
              <button
                type="button"
                onClick={() => selectRole(role.id)}
                className={`w-full rounded-lg px-3 py-2 text-right text-small transition ${
                  role.id === selectedId
                    ? 'bg-[#008c96]/10 font-semibold text-[#008c96]'
                    : 'text-text hover:bg-surface-soft'
                }`}
              >
                <span className="block">{role.label}</span>
                {role.users_count != null ? (
                  <span className="text-caption text-text-muted">
                    {role.users_count.toLocaleString('fa-IR')} نفر
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3 text-primary-dark">{selected.label}</h2>
            {selected.description ? (
              <p className="mt-1 text-small text-text-muted">{selected.description}</p>
            ) : null}
          </div>
          {canManage && !isSuper ? (
            <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              ذخیره دسترسی‌ها
            </button>
          ) : null}
        </div>

        {isSuper ? (
          <p className="mb-4 rounded-lg border border-border bg-surface-soft px-4 py-3 text-small text-text-muted">
            نقش مدیر کل همه دسترسی‌ها را دارد و قابل ویرایش نیست.
          </p>
        ) : null}

        {message ? (
          <p className={`mb-4 text-small ${message.type === 'ok' ? 'text-success' : 'text-error'}`}>
            {message.text}
          </p>
        ) : null}

        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.module}>
              <h3 className="mb-2 text-small font-bold text-text">
                {MODULE_LABELS_FA[group.module] ?? group.module}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {group.permissions.map((perm) => {
                  const on = checked.includes(perm.name) || isSuper;
                  return (
                    <li key={perm.name}>
                      <label
                        className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 text-small ${
                          on ? 'border-[#008c96]/40 bg-[#008c96]/5' : 'border-border'
                        } ${!canManage || isSuper ? 'cursor-default opacity-80' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={on}
                          disabled={!canManage || isSuper}
                          onChange={() => toggle(perm.name, perm.reserved)}
                        />
                        <span>
                          <span className="block font-medium text-text">{perm.label}</span>
                          <span className="font-mono text-caption text-text-muted" dir="ltr">
                            {perm.name}
                            {perm.reserved ? ' · مخصوص مدیر کل' : ''}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
