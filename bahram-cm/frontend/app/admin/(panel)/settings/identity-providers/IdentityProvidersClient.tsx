'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import {
  testIdentityProviderAction,
  updateIdentityProviderAction,
  updateIdentityRouteAction,
} from '../../academy/identity-verifications/actions';
import { CAPABILITY_LABELS } from '@/lib/admin/identityTypes';
import type { IdentityProviderConfig, IdentityRouteConfig } from '@/lib/admin/identityTypes';

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
      const res = await updateIdentityProviderAction(provider.id, body);
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
      const res = await testIdentityProviderAction(provider.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(res.message ?? 'اتصال برقرار شد.');
      router.refresh();
    });
  }

  return (
    <div className="card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-text">{provider.label}</h3>
          <p className="font-mono text-caption text-text-muted" dir="ltr">
            {provider.slug}
          </p>
        </div>
        <span
          className={`rounded-pill px-2.5 py-0.5 text-caption font-medium ${
            provider.credentials_configured
              ? 'bg-success/10 text-success'
              : 'bg-surface-soft text-text-muted'
          }`}
        >
          {provider.credentials_configured ? 'کلید پیکربندی شده' : 'کلید تنظیم نشده'}
        </span>
      </div>

      {provider.capabilities?.length ? (
        <p className="mb-3 text-caption text-text-muted">
          قابلیت‌ها:{' '}
          {provider.capabilities.map((c) => CAPABILITY_LABELS[c] ?? c).join('، ')}
        </p>
      ) : null}

      {canManage ? (
        <div className="space-y-3">
          <label className="inline-flex items-center gap-2 text-small">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            فعال
          </label>
          <div>
            <label className="field-label" htmlFor={`key-${provider.id}`}>
              کلید API (فقط در صورت تغییر وارد کنید)
            </label>
            <input
              id={`key-${provider.id}`}
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
                تست اتصال
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {provider.last_test_status ? (
        <p className="mt-3 text-caption text-text-muted">
          آخرین تست: {provider.last_test_status}
          {provider.last_test_message ? ` — ${provider.last_test_message}` : ''}
        </p>
      ) : null}
      {message ? <p className="mt-2 text-small text-success">{message}</p> : null}
      {error ? <p className="mt-2 text-small text-error">{error}</p> : null}
    </div>
  );
}

function RouteRow({
  route,
  providers,
  canManage,
}: {
  route: IdentityRouteConfig;
  providers: IdentityProviderConfig[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [primary, setPrimary] = useState(route.primary_provider);
  const [fallback, setFallback] = useState(route.fallback_provider ?? '');
  const [active, setActive] = useState(route.is_active);
  const [error, setError] = useState<string | null>(null);

  return (
    <tr className="hover:bg-surface-soft/40">
      <td className="px-4 py-3 text-small font-medium">
        {CAPABILITY_LABELS[route.capability] ?? route.capability}
      </td>
      <td className="px-4 py-3">
        <select
          className="field-input py-1 text-caption"
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
      </td>
      <td className="px-4 py-3">
        <select
          className="field-input py-1 text-caption"
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
      </td>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={active}
          disabled={!canManage || pending}
          onChange={(e) => setActive(e.target.checked)}
        />
      </td>
      <td className="px-4 py-3">
        {canManage ? (
          <button
            type="button"
            className="btn btn-secondary px-3 py-1.5 text-caption"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await updateIdentityRouteAction(route.id, {
                  primary_provider: primary,
                  fallback_provider: fallback || null,
                  is_active: active,
                });
                if (!res.ok) setError(res.error);
                else router.refresh();
              });
            }}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'ذخیره'}
          </button>
        ) : null}
        {error ? <p className="mt-1 text-caption text-error">{error}</p> : null}
      </td>
    </tr>
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
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 text-h3 text-primary-dark">سرویس‌ها</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} canManage={canManage} canTest={canTest} />
          ))}
          {!providers.length ? (
            <div className="card p-6 text-small text-text-muted">هنوز سرویسی ثبت نشده است.</div>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-h3 text-primary-dark">مسیر قابلیت‌ها (Primary / Fallback)</h2>
        <div className="admin-table-wrap overflow-x-auto">
          <table className="admin-table w-full min-w-[36rem] text-right">
            <thead>
              <tr>
                <th className="px-4 py-3">قابلیت</th>
                <th className="px-4 py-3">اصلی</th>
                <th className="px-4 py-3">جایگزین</th>
                <th className="px-4 py-3">فعال</th>
                <th className="px-4 py-3">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <RouteRow key={r.id} route={r} providers={providers} canManage={canManage} />
              ))}
            </tbody>
          </table>
        </div>
        {!routes.length ? (
          <p className="mt-3 text-small text-text-muted">مسیری تعریف نشده است.</p>
        ) : null}
      </section>
    </div>
  );
}
