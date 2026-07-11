'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Loader2,
  Lock,
  Save,
  Users,
} from 'lucide-react';
import { updateRolePermissionsAction } from '../actions';
import { MODULE_LABELS_FA, type AdminRole, type PermissionGroup, type PermissionItem } from '@/lib/admin/accessTypes';
import { StatCard } from '../../ui';
import { cn } from '@/lib/utils';
import { getModuleUi, getRoleUi, moduleAnchorId } from './roleAccessUi';

function PermissionModuleSection({
  module,
  permissions,
  checked,
  disabled,
  isSuper,
  onToggle,
  onSetModule,
}: {
  module: string;
  permissions: PermissionItem[];
  checked: string[];
  disabled: boolean;
  isSuper: boolean;
  onToggle: (name: string, reserved: boolean) => void;
  onSetModule: (names: string[], enabled: boolean) => void;
}) {
  const ui = getModuleUi(module);
  const label = MODULE_LABELS_FA[module] ?? module;
  const enabledCount = permissions.filter((p) => checked.includes(p.name) || isSuper).length;
  const allOn = enabledCount === permissions.length;
  const noneOn = enabledCount === 0;
  const [open, setOpen] = useState(enabledCount > 0);

  const assignable = permissions.filter((p) => !p.reserved || isSuper);

  function selectAll() {
    if (disabled || isSuper) return;
    onSetModule(
      assignable.map((p) => p.name),
      true,
    );
  }

  function clearAll() {
    if (disabled || isSuper) return;
    onSetModule(
      assignable.map((p) => p.name),
      false,
    );
  }

  return (
    <section
      id={moduleAnchorId(module)}
      className={cn('scroll-mt-28 overflow-hidden rounded-2xl border bg-surface shadow-soft', ui.border)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn('flex w-full items-start gap-3 px-4 py-4 text-start transition sm:px-5', ui.soft, 'hover:brightness-[0.98]')}
      >
        <span
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-soft',
            ui.gradient,
          )}
        >
          <ui.icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-primary-dark">{label}</h3>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-caption font-semibold',
                allOn ? 'bg-success/15 text-success' : enabledCount > 0 ? 'bg-accent/15 text-accent' : 'bg-surface-soft text-text-muted',
              )}
            >
              {enabledCount.toLocaleString('fa-IR')} / {permissions.length.toLocaleString('fa-IR')}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-soft">
            <div
              className={cn('h-full rounded-full bg-gradient-to-l transition-all', ui.gradient)}
              style={{ width: `${permissions.length ? (enabledCount / permissions.length) * 100 : 0}%` }}
            />
          </div>
        </div>
        <span className="mt-1 shrink-0 text-text-muted">
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </span>
      </button>

      {open ? (
        <div className="border-t border-border/70 px-4 py-4 sm:px-5">
          {!disabled && !isSuper ? (
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectAll}
                disabled={allOn}
                className="btn btn-secondary px-3 py-1.5 text-caption disabled:opacity-50"
              >
                انتخاب همه
              </button>
              <button
                type="button"
                onClick={clearAll}
                disabled={noneOn}
                className="btn btn-secondary px-3 py-1.5 text-caption disabled:opacity-50"
              >
                حذف همه
              </button>
            </div>
          ) : null}

          <ul className="grid gap-2 sm:grid-cols-2">
            {permissions.map((perm) => {
              const on = checked.includes(perm.name) || isSuper;
              const locked = perm.reserved && !isSuper;
              return (
                <li key={perm.name}>
                  <label
                    className={cn(
                      'group flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-small transition',
                      on
                        ? cn('border-accent/35 shadow-soft', ui.soft)
                        : 'border-border bg-surface hover:border-border/80 hover:bg-surface-soft/50',
                      (disabled || isSuper || locked) && 'cursor-default',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition',
                        on ? 'border-accent bg-accent text-white' : 'border-border bg-surface group-hover:border-accent/40',
                      )}
                    >
                      {on ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : null}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      disabled={disabled || isSuper || locked}
                      onChange={() => onToggle(perm.name, perm.reserved)}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-text">{perm.label}</span>
                        {perm.reserved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-caption font-medium text-amber-700 dark:text-amber-300">
                            <Lock className="h-3 w-3" />
                            مدیر کل
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-caption text-text-muted" dir="ltr">
                        {perm.name}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ModuleJumpNav({ groups }: { groups: PermissionGroup[] }) {
  return (
    <nav
      aria-label="پرش به ماژول‌ها"
      className="sticky top-0 z-20 -mx-1 overflow-x-auto rounded-xl border border-border bg-surface/95 px-2 py-2 backdrop-blur-md"
    >
      <ul className="flex min-w-max items-center gap-1">
        {groups.map((group) => {
          const ui = getModuleUi(group.module);
          const label = MODULE_LABELS_FA[group.module] ?? group.module;
          return (
            <li key={group.module}>
              <a
                href={`#${moduleAnchorId(group.module)}`}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-caption font-medium text-text-muted transition hover:bg-surface-soft hover:text-text"
              >
                <span
                  className={cn(
                    'grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white',
                    ui.gradient,
                  )}
                >
                  <ui.icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </span>
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

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
  const totalPermissions = useMemo(
    () => permissionGroups.reduce((sum, g) => sum + g.permissions.length, 0),
    [permissionGroups],
  );
  const enabledCount = isSuper ? totalPermissions : checked.length;
  const coveredModules = useMemo(() => {
    if (isSuper) return permissionGroups.length;
    return permissionGroups.filter((g) => g.permissions.some((p) => checked.includes(p.name))).length;
  }, [checked, isSuper, permissionGroups]);

  const grouped = useMemo(() => permissionGroups, [permissionGroups]);

  function selectRole(id: number) {
    const role = roles.find((r) => r.id === id);
    setSelectedId(id);
    setChecked(role?.permissions ?? []);
    setMessage(null);
  }

  function toggle(name: string, reserved: boolean) {
    if (!canManage || isSuper || (reserved && !canManage)) return;
    setChecked((prev) => (prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]));
  }

  function setModulePermissions(names: string[], enabled: boolean) {
    if (!canManage || isSuper) return;
    setChecked((prev) => {
      const without = prev.filter((p) => !names.includes(p));
      return enabled ? [...new Set([...without, ...names])] : without;
    });
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
    return (
      <div className="admin-list-empty">
        <p className="admin-list-empty__title">نقشی برای نمایش وجود ندارد</p>
      </div>
    );
  }

  const selectedUi = getRoleUi(selected.name);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="دسترسی‌های فعال"
          value={`${enabledCount.toLocaleString('fa-IR')} / ${totalPermissions.toLocaleString('fa-IR')}`}
          icon="KeyRound"
          tone="teal"
          hint={isSuper ? 'دسترسی کامل' : undefined}
        />
        <StatCard
          label="ماژول‌های پوشش‌داده‌شده"
          value={`${coveredModules.toLocaleString('fa-IR')} / ${permissionGroups.length.toLocaleString('fa-IR')}`}
          icon="Layers"
          tone="blue"
        />
        <StatCard
          label="مدیران این نقش"
          value={(selected.users_count ?? 0).toLocaleString('fa-IR')}
          icon="Users"
          tone="gold"
          hint="کاربر فعال"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="admin-dashboard-panel overflow-hidden">
          <div className="border-b border-border bg-surface-soft/60 px-4 py-3">
            <p className="text-caption font-semibold text-text-muted">انتخاب نقش</p>
            <p className="mt-0.5 text-caption text-text-muted">{roles.length.toLocaleString('fa-IR')} نقش سیستمی</p>
          </div>
          <ul className="space-y-1 p-2">
            {roles.map((role) => {
              const roleUi = getRoleUi(role.name);
              const active = role.id === selectedId;
              const isRoleSuper = role.name === 'super-admin';
              return (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => selectRole(role.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right transition',
                      active ? 'bg-accent/10 ring-1 ring-accent/25' : 'hover:bg-surface-soft',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-soft',
                        roleUi.gradient,
                      )}
                    >
                      {isRoleSuper ? (
                        <Crown className="h-5 w-5" strokeWidth={1.75} />
                      ) : (
                        <roleUi.icon className="h-5 w-5" strokeWidth={1.75} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-small font-semibold', active ? 'text-accent' : 'text-text')}>
                        {role.label}
                      </span>
                      {role.description ? (
                        <span className="mt-0.5 line-clamp-2 block text-caption text-text-muted">{role.description}</span>
                      ) : null}
                      {role.users_count != null ? (
                        <span className="mt-1 inline-flex items-center gap-1 text-caption text-text-muted">
                          <Users className="h-3 w-3" />
                          {role.users_count.toLocaleString('fa-IR')} نفر
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="min-w-0 space-y-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-gradient-to-l from-primary-soft/20 via-surface to-surface px-5 py-4">
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    'grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-soft',
                    selectedUi.gradient,
                  )}
                >
                  {isSuper ? (
                    <Crown className="h-6 w-6" strokeWidth={1.75} />
                  ) : (
                    <selectedUi.icon className="h-6 w-6" strokeWidth={1.75} />
                  )}
                </span>
                <div className="min-w-0">
                  <h2 className="text-h3 font-extrabold text-primary-dark">{selected.label}</h2>
                  {selected.description ? (
                    <p className="mt-1 max-w-2xl text-small text-text-muted">{selected.description}</p>
                  ) : null}
                </div>
              </div>
              {canManage && !isSuper ? (
                <button type="button" className="btn btn-primary shrink-0" disabled={pending} onClick={save}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  ذخیره دسترسی‌ها
                </button>
              ) : null}
            </div>

            {isSuper ? (
              <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <Crown className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-small text-text">
                  نقش <strong>مدیر کل</strong> همه دسترسی‌ها را دارد و قابل ویرایش نیست.
                </p>
              </div>
            ) : null}

            {!canManage ? (
              <div className="mx-5 mt-4 flex items-start gap-3 rounded-xl border border-border bg-surface-soft px-4 py-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
                <p className="text-small text-text-muted">فقط مدیر کل می‌تواند دسترسی نقش‌ها را ویرایش کند.</p>
              </div>
            ) : null}

            {message ? (
              <p
                className={cn(
                  'mx-5 mt-4 rounded-lg px-4 py-2.5 text-small',
                  message.type === 'ok' ? 'bg-success/10 text-success' : 'bg-error/10 text-error',
                )}
              >
                {message.text}
              </p>
            ) : null}

            <div className="space-y-4 p-5">
              <ModuleJumpNav groups={grouped} />

              {grouped.map((group) => (
                <PermissionModuleSection
                  key={group.module}
                  module={group.module}
                  permissions={group.permissions}
                  checked={checked}
                  disabled={!canManage}
                  isSuper={isSuper}
                  onToggle={toggle}
                  onSetModule={setModulePermissions}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
