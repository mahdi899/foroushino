'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Code2,
  Cloud,
  Database,
  Globe,
  HardDrive,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { AdminPage, Badge } from '../ui';
import {
  applyPerformancePresetAction,
  clearPurgeLogAction,
  purgeCacheAction,
  purgeIsrOnlyAction,
  saveCacheSettingsAction,
  toggleDeveloperModeAction,
} from '@/lib/cache/admin';
import {
  CACHE_MODULE_GROUPS,
  CACHE_MODULES,
  CACHE_TAG_GROUPS,
  DEFAULT_CACHE_SETTINGS,
  TTL_FIELDS,
  formatTtl,
  type CachePurgeLogEntry,
  type CacheSettings,
  type CacheStatus,
} from '@/lib/cache/types';
import { PERFORMANCE_PRESETS, type PerformancePresetId } from '@/lib/cache/presets';
import { useCachePanel } from '@/hooks/useCachePanel';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type Tab = 'dashboard' | 'profiles' | 'modules' | 'ttl' | 'purge' | 'advanced';

const FALLBACK_STATUS: CacheStatus = {
  laravel_cache_driver: 'نامشخص',
  next_webhook_configured: false,
  cloudflare_configured: false,
  developer_mode: false,
  cloudflare_dev_mode: null,
  modules: {
    page_cache: true,
    object_cache: true,
    browser_cache: true,
    cdn_html_cache: false,
    cloudflare_auto_purge: false,
  },
  isr_tags: [],
  isr_ttls: {},
  purge_log: [],
};

export default function CacheAdminPage() {
  const { status: remoteStatus, settings: remoteSettings, backendOk, backendError, loading, refresh } =
    useCachePanel();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [settings, setSettings] = useState<CacheSettings>(DEFAULT_CACHE_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [purging, setPurging] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState('/');
  const [applyingPreset, setApplyingPreset] = useState<PerformancePresetId | null>(null);
  const [devModeToggling, setDevModeToggling] = useState(false);
  const [clearingLog, setClearingLog] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const status = remoteStatus ?? FALLBACK_STATUS;

  useEffect(() => {
    if (remoteSettings) {
      setSettings(remoteSettings);
    }
  }, [remoteSettings]);

  async function handleDeveloperMode(enable: boolean) {
    setDevModeToggling(true);
    setMessage(null);
    const res = await toggleDeveloperModeAction(enable);
    setDevModeToggling(false);
    if (res.ok) {
      if (res.settings) setSettings(res.settings);
      const cf = res.cloudflare_dev_mode;
      const cfMsg =
        cf === true
          ? ' Cloudflare Developer Mode فعال شد.'
          : cf === false && status.cloudflare_configured
            ? ' Cloudflare Developer Mode غیرفعال شد.'
            : !status.cloudflare_configured
              ? ' (Cloudflare تنظیم نشده)'
              : '';
      setMessage(
        enable
          ? `حالت توسعه‌دهنده فعال شد — تمام بهینه‌سازی‌ها خاموش و کش‌ها پاک شد.${cfMsg}`
          : `حالت توسعه‌دهنده غیرفعال شد — تنظیمات قبلی بازگردانده شد.${cfMsg}`,
      );
      await refresh();
    } else {
      setMessage(res.error ?? 'خطا در تغییر حالت توسعه‌دهنده');
    }
  }

  async function handleApplyPreset(presetId: PerformancePresetId) {
    setApplyingPreset(presetId);
    setMessage(null);
    const res = await applyPerformancePresetAction(presetId, settings);
    setApplyingPreset(null);
    if (res.ok && res.settings) {
      setSettings(res.settings);
      setMessage(`پروفایل «${PERFORMANCE_PRESETS.find((p) => p.id === presetId)?.label}» اعمال شد.`);
      await refresh();
    } else {
      setMessage(res.error ?? 'خطا در اعمال پروفایل');
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const res = await saveCacheSettingsAction(settings);
    setSaving(false);
    if (res.ok && res.settings) {
      setSettings(res.settings);
      setMessage('تنظیمات ذخیره شد.');
      await refresh();
    } else {
      setMessage(res.error ?? 'خطا در ذخیره تنظیمات');
    }
  }

  async function handlePurge(scope: string, extra?: { tags?: string[]; paths?: string[]; warm?: boolean }) {
    setPurging(scope);
    setMessage(null);
    const res = await purgeCacheAction({ scope, ...extra });
    setPurging(null);
    if (res.ok) {
      const via = res.source === 'local' ? ' (مستقیم از Next.js)' : '';
      setMessage(`پاک‌سازی کش انجام شد${via}.`);
      await refresh();
    } else {
      setMessage(res.error ?? 'خطا در پاک‌سازی');
    }
  }

  async function handleLocalPurge(all?: boolean, tags?: string[], paths?: string[]) {
    const key = all ? 'local-all' : `local-${tags?.join(',') ?? paths?.join(',')}`;
    setPurging(key);
    setMessage(null);
    try {
      const res = await purgeIsrOnlyAction({ all, tags, paths });
      setMessage(`ISR پاک شد: ${res.tags.length} تگ، ${res.paths.length} مسیر`);
      await refresh();
    } catch {
      setMessage('خطا در پاک‌سازی ISR محلی');
    } finally {
      setPurging(null);
    }
  }

  async function handleClearPurgeLog() {
    setClearingLog(true);
    setMessage(null);
    const res = await clearPurgeLogAction();
    setClearingLog(false);
    if (res.ok) {
      setMessage('لاگ پاک‌سازی‌ها خالی شد.');
      await refresh();
    } else {
      setMessage(res.error ?? 'خطا در پاک کردن لاگ');
    }
  }

  function toggleSetting(key: keyof CacheSettings) {
    if (key === 'performance_preset' || key === 'purge_log' || key === 'developer_mode') return;
    if (typeof DEFAULT_CACHE_SETTINGS[key] === 'number') return;
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }

  const purgeLog = (status.purge_log ?? []).slice(0, 10);

  return (
    <AdminPage
      title="کش و بهینه‌سازی"
      desc="مدیریت کش صفحه، API، مرورگر و CDN — کنترل کامل از پنل ادمین"
      action={
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDeveloperMode(!settings.developer_mode)}
            disabled={devModeToggling || !backendOk}
            className={cn(
              'btn px-4 py-2 text-small',
              settings.developer_mode
                ? 'border border-warning bg-warning/15 text-warning hover:bg-warning/25'
                : 'btn-secondary',
            )}
            title="غیرفعال کردن کش و فعال‌سازی Cloudflare Developer Mode"
          >
            {devModeToggling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Code2 className="h-4 w-4" />
            )}
            {settings.developer_mode ? 'خروج از Dev' : 'حالت توسعه‌دهنده'}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="btn btn-secondary px-4 py-2 text-small"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            بروزرسانی
          </button>
        </div>
      }
    >
      {settings.developer_mode && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/50 bg-warning/10 p-3 text-small">
          <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-primary-dark">حالت توسعه‌دهنده فعال است</p>
            <p className="mt-1 text-caption text-text-muted">
              کش صفحه، مرورگر و بهینه‌سازی‌ها غیرفعال‌اند.
              {status.cloudflare_dev_mode
                ? ' Cloudflare Developer Mode روشن است (۳ ساعت).'
                : status.cloudflare_configured
                  ? ' Cloudflare Developer Mode در دسترس نیست.'
                  : ''}
            </p>
          </div>
        </div>
      )}

      {!backendOk && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-small text-text">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-semibold text-primary-dark">اتصال به Laravel برقرار نیست</p>
            <p className="mt-1 text-caption text-text-muted">
              {backendError ?? 'API در دسترس نیست.'} — پاک‌سازی ISR از Next.js و تنظیمات محلی همچنان کار می‌کند.
            </p>
          </div>
        </div>
      )}

      {message && (
        <p className={`mb-4 text-small ${message.includes('خطا') ? 'text-danger' : 'text-success'}`}>{message}</p>
      )}

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border">
        {(
          [
            ['dashboard', 'داشبورد'],
            ['profiles', 'پروفایل سرعت'],
            ['modules', 'ماژول‌ها'],
            ['ttl', 'TTL کش'],
            ['purge', 'پاک‌سازی'],
            ['advanced', 'پیشرفته'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              'border-b-2 px-4 py-2 text-small font-medium transition-colors',
              tab === id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && tab === 'dashboard' && (
        <div className="space-y-6">
          {(() => {
            const cacheLive = !status.developer_mode;
            return (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatusCard
              icon={Zap}
              label="کش صفحه ISR"
              value={status.modules?.page_cache ? 'فعال' : 'غیرفعال'}
              hint={status.next_webhook_configured ? 'Webhook متصل' : 'Webhook تنظیم نشده'}
              ok={cacheLive && !!status.modules?.page_cache && status.next_webhook_configured}
            />
            <StatusCard
              icon={Database}
              label="کش Laravel"
              value={status.laravel_cache_driver}
              hint={status.modules?.object_cache ? 'فعال' : 'غیرفعال'}
              ok={cacheLive && !!status.modules?.object_cache}
            />
            <StatusCard
              icon={Globe}
              label="کش مرورگر"
              value={status.modules?.browser_cache ? 'فعال' : 'غیرفعال'}
              hint={`TTL: ${formatTtl(settings.browser_cache_ttl)}`}
              ok={cacheLive && !!status.modules?.browser_cache}
            />
            <StatusCard
              icon={Cloud}
              label="Cloudflare"
              value={status.cloudflare_configured ? 'متصل' : 'تنظیم نشده'}
              hint={status.modules?.cloudflare_auto_purge ? 'Purge خودکار' : 'دستی'}
              ok={status.cloudflare_configured}
            />
          </div>
            );
          })()}

          <div>
            <h2 className="mb-3 text-h3 font-bold text-primary-dark">TTL کش محتوا (ISR)</h2>
            <div className="admin-table-wrap overflow-x-auto">
              <table className="admin-table w-full min-w-[320px] text-right text-small">
                <thead>
                  <tr>
                    <th className="px-4 py-3 font-semibold">بخش</th>
                    <th className="px-4 py-3 font-semibold">تگ</th>
                    <th className="px-4 py-3 font-semibold">TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {CACHE_TAG_GROUPS.map((g) => (
                    <tr key={g.id}>
                      <td className="px-4 py-3 font-medium">{g.label}</td>
                      <td className="px-4 py-3 font-mono text-caption text-text-muted">{g.tags.join(', ')}</td>
                      <td className="px-4 py-3">{formatTtl(Number(settings[g.ttlKey]) || g.fallbackSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <PurgeLogSection
            entries={purgeLog}
            clearing={clearingLog}
            disabled={!backendOk}
            onClear={() => void handleClearPurgeLog()}
          />
        </div>
      )}

      {!loading && tab === 'profiles' && (
        <div className="space-y-4">
          <p className="text-small text-text-muted">
            یک پروفایل آماده انتخاب کنید — تمام تنظیمات کش، بارگذاری و TTL به‌صورت خودکار اعمال می‌شود.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {PERFORMANCE_PRESETS.map((preset) => {
              const active = settings.performance_preset === preset.id;
              return (
                <div
                  key={preset.id}
                  className={cn(
                    'rounded-xl border p-4 transition',
                    active ? 'border-accent bg-accent-soft/30' : 'border-border bg-surface',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h3 className="text-small font-bold text-primary-dark">{preset.label}</h3>
                    {active && <Badge tone="success">فعال</Badge>}
                  </div>
                  <p className="text-caption leading-6 text-text-muted">{preset.description}</p>
                  <p className="mt-1.5 text-caption text-accent">{preset.hint}</p>
                  <button
                    type="button"
                    disabled={!backendOk || applyingPreset !== null}
                    onClick={() => void handleApplyPreset(preset.id)}
                    className="btn btn-primary mt-3 w-full px-3 py-2 text-caption"
                  >
                    {applyingPreset === preset.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : active ? (
                      'اعمال مجدد'
                    ) : (
                      'اعمال پروفایل'
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && tab === 'modules' && (
        <div className="space-y-6">
          <p className="text-small text-text-muted">
            ماژول‌ها را به تفکیک گروه فعال یا غیرفعال کنید. پس از تغییر، دکمه ذخیره را بزنید.
          </p>
          {CACHE_MODULE_GROUPS.map((group) => (
            <div key={group.id}>
              <h2 className="mb-2 text-small font-bold text-primary-dark">{group.label}</h2>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {CACHE_MODULES.filter((m) => m.group === group.id).map((mod) => {
                  const key = mod.settingKey;
                  const enabled = Boolean(settings[key]);
                  return (
                    <label
                      key={mod.id}
                      className={cn(
                        'flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border p-3 transition',
                        mod.builtin ? 'opacity-75' : 'hover:border-accent/40',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-small font-semibold text-primary-dark">{mod.label}</p>
                        <p className="mt-0.5 text-caption leading-5 text-text-muted">{mod.description}</p>
                        {mod.builtin && <Badge tone="default">داخلی Next.js</Badge>}
                      </div>
                      <input
                        type="checkbox"
                        checked={enabled}
                        disabled={mod.builtin || !backendOk}
                        onChange={() => toggleSetting(key)}
                        className="mt-1 h-5 w-5 shrink-0 accent-accent"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !backendOk}
            className="btn btn-primary px-5 py-2.5 text-small"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره تنظیمات
          </button>
        </div>
      )}

      {!loading && tab === 'ttl' && (
        <div className="space-y-4">
          <p className="text-small text-text-muted">
            مدت زمان کش هر بخش را تنظیم کنید. مقادیر بلندتر = سرعت بیشتر، بروزرسانی کندتر.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {TTL_FIELDS.map((field) => (
              <div key={field.key} className="rounded-xl border border-border p-4">
                <label className="field-label" htmlFor={`ttl-${field.key}`}>
                  {field.label}
                </label>
                <input
                  id={`ttl-${field.key}`}
                  type="number"
                  min={field.min}
                  max={field.max}
                  disabled={!backendOk}
                  value={Number(settings[field.key])}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, [field.key]: Number(e.target.value) }))
                  }
                  className="field-input mt-1 w-full"
                />
                <p className="mt-1 text-caption text-text-muted">
                  فعلی: {formatTtl(Number(settings[field.key]))}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-border p-4">
            <label className="field-label" htmlFor="browser-ttl">
              مدت کش مرورگر (ثانیه)
            </label>
            <input
              id="browser-ttl"
              type="number"
              min={60}
              max={604800}
              value={settings.browser_cache_ttl}
              disabled={!backendOk}
              onChange={(e) => setSettings((s) => ({ ...s, browser_cache_ttl: Number(e.target.value) }))}
              className="field-input mt-1 max-w-xs"
            />
            <p className="mt-1 text-caption text-text-muted">پیشنهاد production: ۳۶۰۰ (۱ ساعت)</p>
          </div>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !backendOk}
            className="btn btn-primary px-5 py-2.5 text-small"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره TTL
          </button>
        </div>
      )}

      {!loading && tab === 'purge' && (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-surface-soft/50 p-4 text-small text-text-muted">
            پاک‌سازی کامل از Laravel انجام می‌شود. اگر API در دسترس نباشد، ISR به‌صورت خودکار از Next.js پاک می‌شود.
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PurgeButton
              label="پاک‌سازی کامل"
              desc="ISR + Laravel + Cloudflare (در صورت فعال بودن)"
              loading={purging === 'all'}
              onClick={() => void handlePurge('all', { warm: settings.warm_cache_after_purge })}
              variant="danger"
            />
            <PurgeButton
              label="فقط کش صفحه (ISR)"
              desc="تمام تگ‌های Next.js"
              loading={purging === 'isr'}
              onClick={() => void handlePurge('isr')}
            />
            <PurgeButton
              label="فقط کش Laravel"
              desc="Cache::flush"
              loading={purging === 'laravel'}
              onClick={() => void handlePurge('laravel')}
            />
            <PurgeButton
              label="فقط Cloudflare"
              desc="Purge Everything"
              loading={purging === 'cloudflare'}
              onClick={() => void handlePurge('cloudflare')}
            />
            <PurgeButton
              label="ISR مستقیم (Next.js)"
              desc="بدون نیاز به Laravel"
              loading={purging === 'local-all'}
              onClick={() => void handleLocalPurge(true)}
            />
          </div>

          <div>
            <h2 className="mb-3 text-h3 font-bold text-primary-dark">پاک‌سازی بر اساس بخش</h2>
            <div className="flex flex-wrap gap-2">
              {CACHE_TAG_GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  disabled={purging !== null}
                  onClick={() => void handlePurge('isr', { tags: g.tags })}
                  className="btn btn-secondary px-3 py-1.5 text-caption"
                >
                  {purging === 'isr' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <h2 className="mb-2 text-small font-bold text-primary-dark">پاک‌سازی یک URL</h2>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="field-input flex-1"
                dir="ltr"
                placeholder="/insights/my-post"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
              />
              <button
                type="button"
                disabled={purging !== null || !customPath.trim()}
                onClick={() => void handlePurge(`path:${customPath.trim()}`, { paths: [customPath.trim()] })}
                className="btn btn-secondary shrink-0 px-4 py-2 text-small"
              >
                {purging?.startsWith('path:') ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Purge URL
              </button>
              <button
                type="button"
                disabled={purging !== null || !customPath.trim()}
                onClick={() => void handleLocalPurge(false, [], [customPath.trim()])}
                className="btn btn-secondary shrink-0 px-4 py-2 text-small"
              >
                ISR محلی
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'advanced' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard
              icon={Server}
              title="Webhook ISR"
              value={status.next_webhook_configured ? 'پیکربندی شده' : 'تنظیم نشده'}
              hint="مدیریت از تنظیمات سایت"
              href="/admin/settings#cache-integrations"
              ok={status.next_webhook_configured}
            />
            <InfoCard
              icon={Database}
              title="درایور کش Laravel"
              value={status.laravel_cache_driver}
              hint="برای production پیشنهاد: redis"
              ok={isLaravelCacheDriverOk(status.laravel_cache_driver)}
            />
            <InfoCard
              icon={Cloud}
              title="Cloudflare CDN"
              value={status.cloudflare_configured ? 'فعال' : 'غیرفعال'}
              hint="مدیریت از تنظیمات سایت"
              href="/admin/settings#cache-integrations"
              ok={status.cloudflare_configured}
            />
            <InfoCard
              icon={Globe}
              title="اتصال API"
              value={backendOk ? 'متصل' : 'قطع'}
              hint={backendOk ? 'Laravel پاسخ می‌دهد' : (backendError ?? 'بررسی کنید سرور بک‌اند روشن باشد')}
              ok={backendOk}
            />
          </div>

          <div className="rounded-xl border border-border p-4 text-small text-text-muted">
            <p className="font-semibold text-primary-dark">تگ‌های ISR فعال</p>
            <p className="mt-2 font-mono text-caption" dir="ltr">
              {(status.isr_tags ?? []).join(', ') || 'articles, cases, services, settings, pricing, seo, redirects, faqs, testimonials, chatbot'}
            </p>
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function PurgeLogSection({
  entries,
  clearing,
  disabled,
  onClear,
}: {
  entries: CachePurgeLogEntry[];
  clearing: boolean;
  disabled: boolean;
  onClear: () => void;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-small font-bold text-primary-dark">آخرین پاک‌سازی‌ها</h2>
          <p className="text-caption text-text-muted">حداکثر ۱۰ مورد اخیر</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={clearing || disabled || entries.length === 0}
          className="btn btn-secondary px-3 py-1.5 text-caption"
        >
          {clearing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          پاک کردن لاگ
        </button>
      </div>
      <ul className="space-y-2">
        {entries.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-caption text-text-muted">
            هنوز پاک‌سازی ثبت نشده.
          </li>
        ) : (
          entries.map((entry, i) => <PurgeLogRow key={`${entry.at}-${i}`} entry={entry} />)
        )}
      </ul>
    </div>
  );
}

function isAutoPurgeEntry(entry: CachePurgeLogEntry): boolean {
  return Boolean(entry.auto) || entry.scope === 'auto' || entry.actor === 'ربات';
}

function PurgeLogRow({ entry }: { entry: CachePurgeLogEntry }) {
  const auto = isAutoPurgeEntry(entry);
  const tags = entry.tags ?? [];
  const paths = entry.paths ?? [];
  const detailParts: string[] = [];
  if (entry.label) detailParts.push(entry.label);
  if (tags.length > 0) detailParts.push(`tags: ${tags.join(', ')}`);
  if (paths.length > 0) detailParts.push(`paths: ${paths.slice(0, 3).join(', ')}${paths.length > 3 ? '…' : ''}`);
  if (entry.laravel) detailParts.push('Laravel');
  if (entry.cloudflare) detailParts.push('CF');

  return (
    <li
      className={cn(
        'rounded-lg border p-3 transition',
        auto
          ? 'border-accent/30 bg-gradient-to-l from-accent-soft/45 via-violet-500/[0.06] to-cyan-500/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
          : 'border-border bg-surface',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className={cn(
              'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
              auto
                ? 'border-accent/35 bg-gradient-to-br from-accent/20 to-violet-500/15 text-accent'
                : 'border-border bg-surface-soft text-text-muted',
            )}
            aria-hidden
          >
            {auto ? <Bot className="h-4 w-4" strokeWidth={1.7} /> : <Sparkles className="h-3.5 w-3.5" strokeWidth={1.6} />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={auto ? 'accent' : 'default'}>{auto ? 'خودکار' : entry.scope}</Badge>
              <span className="text-caption font-medium text-primary-dark">{entry.actor ?? '—'}</span>
            </div>
            <p className="mt-1 text-caption leading-5 text-text-muted">{detailParts.join(' · ') || '—'}</p>
          </div>
        </div>
        <time className="shrink-0 text-caption text-text-muted" dir="ltr" dateTime={entry.at}>
          {entry.at ? new Date(entry.at).toLocaleString('fa-IR') : '—'}
        </time>
      </div>
    </li>
  );
}

function isLaravelCacheDriverOk(driver: string | undefined): boolean {
  const normalized = (driver ?? '').trim().toLowerCase();
  return normalized !== '' && normalized !== 'array';
}

function StatusCard({
  icon: Icon,
  label,
  value,
  hint,
  ok,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
  hint?: string;
  ok: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <Icon className="h-5 w-5 text-accent" strokeWidth={1.6} />
        <Badge tone={ok ? 'success' : 'danger'}>{ok ? 'OK' : 'OFF'}</Badge>
      </div>
      <p className="text-caption text-text-muted">{label}</p>
      <p className="mt-1 font-bold text-primary-dark">{value}</p>
      {hint && <p className="mt-0.5 text-caption text-text-muted">{hint}</p>}
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  value,
  hint,
  href,
  ok,
}: {
  icon: typeof Server;
  title: string;
  value: string;
  hint: string;
  href?: string;
  ok: boolean;
}) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
          <p className="font-semibold text-primary-dark">{title}</p>
        </div>
        <Badge tone={ok ? 'success' : 'danger'}>{ok ? 'OK' : 'OFF'}</Badge>
      </div>
      <p className="text-small font-medium">{value}</p>
      <p className="mt-1 text-caption text-text-muted">{hint}</p>
      {href && (
        <Link href={href} className="mt-2 inline-block text-caption font-medium text-accent hover:underline">
          رفتن به تنظیمات
        </Link>
      )}
    </div>
  );
}

function PurgeButton({
  label,
  desc,
  loading,
  onClick,
  variant,
}: {
  label: string;
  desc: string;
  loading: boolean;
  onClick: () => void;
  variant?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        'rounded-xl border p-4 text-right transition hover:border-accent/50 disabled:opacity-60',
        variant === 'danger' ? 'border-danger/30 bg-danger/5' : 'border-border bg-surface',
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-primary-dark">{label}</span>
        {loading ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : <Trash2 className="h-4 w-4 text-text-muted" />}
      </div>
      <p className="text-caption text-text-muted">{desc}</p>
    </button>
  );
}
