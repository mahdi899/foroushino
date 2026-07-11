'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  PlugZap,
  Route,
  Save,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { AdminContentPanel } from '@/components/admin/layout/AdminContentPanel';
import { AdminListEmpty } from '@/components/admin/layout/AdminListEmpty';
import { StatCard } from '../../ui';
import {
  testIdentityProviderAction,
  updateIdentityProviderAction,
  updateIdentityRouteAction,
} from '../../academy/identity-verifications/actions';
import { CAPABILITY_LABELS } from '@/lib/admin/identityTypes';
import type { IdentityProviderConfig, IdentityRouteConfig } from '@/lib/admin/identityTypes';
import { cn } from '@/lib/utils';
import { getCapabilityUi, getProviderUi } from './identityProviderUi';

function ProviderCard({
  provider,
  canManage,
  canTest,
}: {
  provider: IdentityProviderConfig;
  canManage: boolean;
  canTest: boolean;
}) {
  const router = useRouter();
  const ui = getProviderUi(provider.slug);
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(provider.is_enabled);
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const body: {
        is_enabled: boolean;
        credentials?: Record<string, string>;
      } = { is_enabled: enabled };
      if (apiKey.trim()) body.credentials = { api_key: apiKey.trim() };
      const res = await updateIdentityProviderAction(provider.slug, body);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setApiKey('');
      setMessage('ذخیره شد.');
      router.refresh();
    });
  }

  function test() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await testIdentityProviderAction(provider.slug);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(res.message ?? 'اتصال برقرار شد.');
      router.refresh();
    });
  }

  const testOk = provider.last_test_status === 'ok' || provider.last_test_status === 'success';

  return (
    <article className={cn('overflow-hidden rounded-2xl border bg-surface shadow-soft', ui.border)}>
      <div className={cn('flex items-start gap-3 border-b border-border/70 px-4 py-4 sm:px-5', ui.soft)}>
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
            <h3 className="text-base font-bold text-primary-dark">{provider.label}</h3>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-caption font-semibold',
                provider.is_enabled ? 'bg-success/15 text-success' : 'bg-surface-soft text-text-muted',
              )}
            >
              {provider.is_enabled ? 'فعال' : 'غیرفعال'}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-caption text-text-muted" dir="ltr">
            {provider.slug}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium',
            provider.credentials_configured ? 'bg-success/10 text-success' : 'bg-amber-500/12 text-amber-700 dark:text-amber-300',
          )}
        >
          <KeyRound className="h-3.5 w-3.5" />
          {provider.credentials_configured ? 'کلید تنظیم شده' : 'بدون کلید'}
        </span>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {provider.capabilities?.length ? (
          <div>
            <p className="mb-2 text-caption font-semibold text-text-muted">قابلیت‌ها</p>
            <div className="flex flex-wrap gap-2">
              {provider.capabilities.map((capability) => {
                const capUi = getCapabilityUi(capability);
                return (
                  <span
                    key={capability}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium',
                      capUi.soft,
                    )}
                  >
                    <capUi.icon className="h-3.5 w-3.5" />
                    {CAPABILITY_LABELS[capability] ?? capability}
                  </span>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-caption text-text-muted">قابلیتی تعریف نشده — سرویس در حالت آماده‌سازی است.</p>
        )}

        {canManage ? (
          <div className="space-y-3 rounded-xl border border-border bg-surface-soft/40 p-4">
            <label className="inline-flex items-center gap-2 text-small font-medium">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              فعال‌سازی سرویس
            </label>
            <div>
              <label className="field-label" htmlFor={`key-${provider.slug}`}>
                کلید API (فقط در صورت تغییر)
              </label>
              <input
                id={`key-${provider.slug}`}
                type="password"
                className="field-input"
                dir="ltr"
                placeholder={provider.credentials_configured ? '••••••••' : 'وارد کردن کلید'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary" disabled={pending} onClick={save}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                ذخیره
              </button>
              {canTest ? (
                <button type="button" className="btn btn-secondary" disabled={pending} onClick={test}>
                  <PlugZap className="h-4 w-4" />
                  تست اتصال
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {provider.last_test_status ? (
          <div
            className={cn(
              'flex items-start gap-2 rounded-lg px-3 py-2 text-caption',
              testOk ? 'bg-success/10 text-success' : 'bg-error/10 text-error',
            )}
          >
            {testOk ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>
              آخرین تست: {provider.last_test_status}
              {provider.last_test_message ? ` — ${provider.last_test_message}` : ''}
            </span>
          </div>
        ) : null}

        {message ? <p className="text-small text-success">{message}</p> : null}
        {error ? <p className="text-small text-error">{error}</p> : null}
      </div>
    </article>
  );
}

function RouteCard({
  route,
  providers,
  canManage,
}: {
  route: IdentityRouteConfig;
  providers: IdentityProviderConfig[];
  canManage: boolean;
}) {
  const router = useRouter();
  const ui = getCapabilityUi(route.capability);
  const [pending, startTransition] = useTransition();
  const [primary, setPrimary] = useState(route.primary_provider);
  const [fallback, setFallback] = useState(route.fallback_provider ?? '');
  const [active, setActive] = useState(route.is_active);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const primaryProvider = providers.find((p) => p.slug === primary);
  const fallbackProvider = fallback ? providers.find((p) => p.slug === fallback) : null;

  return (
    <article className={cn('overflow-hidden rounded-2xl border border-border bg-surface shadow-soft')}>
      <div className={cn('flex items-start gap-3 border-b border-border/70 px-4 py-4', ui.soft)}>
        <span
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white shadow-soft',
            ui.gradient,
          )}
        >
          <ui.icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-primary-dark">
              {CAPABILITY_LABELS[route.capability] ?? route.capability}
            </h3>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-caption font-semibold',
                active ? 'bg-success/15 text-success' : 'bg-surface-soft text-text-muted',
              )}
            >
              {active ? 'فعال' : 'غیرفعال'}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-caption text-text-muted" dir="ltr">
            {route.capability}
          </p>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-2">
        <label className="block">
          <span className="field-label">سرویس اصلی</span>
          <select
            className="field-input"
            value={primary}
            disabled={!canManage || pending}
            onChange={(e) => setPrimary(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
          {primaryProvider ? (
            <p className="mt-1 text-caption text-text-muted">
              {primaryProvider.is_enabled ? 'سرویس فعال است' : 'سرویس غیرفعال — مسیر ممکن است خطا دهد'}
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="field-label">سرویس جایگزین</span>
          <select
            className="field-input"
            value={fallback}
            disabled={!canManage || pending}
            onChange={(e) => setFallback(e.target.value)}
          >
            <option value="">بدون جایگزین</option>
            {providers.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label}
              </option>
            ))}
          </select>
          {fallbackProvider ? (
            <p className="mt-1 text-caption text-text-muted">در صورت خطای سرویس اصلی استفاده می‌شود</p>
          ) : (
            <p className="mt-1 text-caption text-text-muted">اختیاری</p>
          )}
        </label>

        <label className="inline-flex items-center gap-2 text-small sm:col-span-2">
          <input
            type="checkbox"
            checked={active}
            disabled={!canManage || pending}
            onChange={(e) => setActive(e.target.checked)}
          />
          مسیر فعال باشد
        </label>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3">
          <button
            type="button"
            className="btn btn-primary px-4 py-2 text-small"
            disabled={pending}
            onClick={() => {
              setError(null);
              setSaved(false);
              startTransition(async () => {
                const res = await updateIdentityRouteAction(route.id, {
                  primary_provider: primary,
                  fallback_provider: fallback || null,
                  is_active: active,
                });
                if (!res.ok) setError(res.error);
                else {
                  setSaved(true);
                  router.refresh();
                }
              });
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره مسیر
          </button>
          {saved ? <span className="text-caption text-success">ذخیره شد</span> : null}
          {error ? <span className="text-caption text-error">{error}</span> : null}
        </div>
      ) : null}
    </article>
  );
}

export function IdentityProvidersClient({
  providers,
  routes,
  canManage,
  canTest,
}: {
  providers: IdentityProviderConfig[];
  routes: IdentityRouteConfig[];
  canManage: boolean;
  canTest: boolean;
}) {
  const stats = useMemo(() => {
    const enabled = providers.filter((p) => p.is_enabled).length;
    const configured = providers.filter((p) => p.credentials_configured).length;
    const activeRoutes = routes.filter((r) => r.is_active).length;
    return { enabled, configured, activeRoutes };
  }, [providers, routes]);

  return (
    <div className="admin-content-list space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="سرویس‌های فعال"
          value={`${stats.enabled.toLocaleString('fa-IR')} / ${providers.length.toLocaleString('fa-IR')}`}
          icon="ShieldCheck"
          tone="teal"
        />
        <StatCard
          label="کلید پیکربندی‌شده"
          value={stats.configured.toLocaleString('fa-IR')}
          icon="KeyRound"
          tone="blue"
        />
        <StatCard
          label="مسیرهای فعال"
          value={`${stats.activeRoutes.toLocaleString('fa-IR')} / ${routes.length.toLocaleString('fa-IR')}`}
          icon="Cable"
          tone="gold"
        />
      </div>

      {!canManage ? (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-soft px-4 py-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-text-muted" />
          <p className="text-small text-text-muted">فقط مشاهده — برای ویرایش به دسترسی «مدیریت سرویس احراز» نیاز است.</p>
        </div>
      ) : null}

      <AdminContentPanel
        title="سرویس‌های اتصال"
        summary={
          providers.length > 0 ? (
            <>
              {providers.length.toLocaleString('fa-IR')} سرویس · {stats.enabled.toLocaleString('fa-IR')} فعال
            </>
          ) : undefined
        }
      >
        {providers.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {providers.map((provider) => (
              <ProviderCard key={provider.slug} provider={provider} canManage={canManage} canTest={canTest} />
            ))}
          </div>
        ) : (
          <AdminListEmpty
            icon="ShieldCheck"
            title="هنوز سرویسی ثبت نشده"
            description="سرویس‌های احراز هویت از بک‌اند بارگذاری می‌شوند."
          />
        )}
      </AdminContentPanel>

      <AdminContentPanel
        title="مسیر قابلیت‌ها"
        summary={
          routes.length > 0 ? (
            <>
              <Route className="me-1 inline h-3.5 w-3.5" />
              Primary / Fallback برای هر قابلیت
            </>
          ) : undefined
        }
      >
        {routes.length > 0 ? (
          <div className="grid gap-4">
            {routes.map((route) => (
              <RouteCard key={route.id} route={route} providers={providers} canManage={canManage} />
            ))}
          </div>
        ) : (
          <AdminListEmpty
            icon="Cable"
            title="مسیری تعریف نشده"
            description="مسیرهای قابلیت از seeder بک‌اند ساخته می‌شوند."
          />
        )}
      </AdminContentPanel>
    </div>
  );
}
