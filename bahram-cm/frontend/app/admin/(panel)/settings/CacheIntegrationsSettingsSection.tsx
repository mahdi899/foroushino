'use client';

import { Cloud, Loader2, Server, Zap } from 'lucide-react';
import { Badge } from '../ui';
import {
  CDN_PROVIDER_OPTIONS,
  type CacheIntegrationsForm,
  type CacheIntegrationsView,
  type CdnProvider,
} from '@/lib/cache/integrations.types';
import { cn } from '@/lib/utils';

type Props = {
  form: CacheIntegrationsForm;
  view: CacheIntegrationsView | null;
  testing: 'webhook' | 'arvan' | 'cloudflare' | null;
  onChange: (form: CacheIntegrationsForm) => void;
  onTest: (target: 'webhook' | 'arvan' | 'cloudflare') => void;
};

export function CacheIntegrationsSettingsSection({
  form,
  view,
  testing,
  onChange,
  onTest,
}: Props) {
  const webhookOk = view?.webhook_configured ?? false;
  const activeProvider = form.cdnProvider;
  const activeConfigured = view?.cdn_active_configured ?? false;

  const patch = (partial: Partial<CacheIntegrationsForm>) => onChange({ ...form, ...partial });

  return (
    <div id="cache-integrations" className="space-y-6">
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">CDN لبه (Arvan / Cloudflare)</h2>
              <p className="mt-1 text-small text-text-muted">
                یک ارائه‌دهنده را انتخاب کنید؛ purge خودکار و دستی فقط روی همان اعمال می‌شود. می‌توانید هر
                زمان سوییچ کنید.
              </p>
            </div>
          </div>
          <Badge tone={activeConfigured ? 'success' : activeProvider === 'none' ? 'default' : 'warning'}>
            {activeProvider === 'none'
              ? 'CDN غیرفعال'
              : activeConfigured
                ? `${view?.cdn_provider_label ?? activeProvider} — متصل`
                : `${view?.cdn_provider_label ?? activeProvider} — تنظیم نشده`}
          </Badge>
        </div>

        <p className="mb-3 text-caption font-medium text-text">ارائه‌دهنده فعال</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {CDN_PROVIDER_OPTIONS.map((opt) => {
            const selected = activeProvider === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => patch({ cdnProvider: opt.id as CdnProvider })}
                className={cn(
                  'rounded-xl border p-3 text-right transition',
                  selected
                    ? 'border-accent bg-accent-soft/40 ring-1 ring-accent/30'
                    : 'border-border bg-surface hover:border-accent/40',
                )}
              >
                <p className="text-small font-semibold text-primary-dark">{opt.label}</p>
                <p className="mt-1 text-caption text-text-muted">{opt.hint}</p>
              </button>
            );
          })}
        </div>
        {view?.env_fallback.cdn_provider && (
          <p className="mt-2 text-caption text-text-muted">fallback از env: CDN_PROVIDER</p>
        )}
      </div>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Server className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">Webhook ISR (Next.js)</h2>
              <p className="mt-1 text-small text-text-muted">
                پس از ویرایش محتوا، Laravel این Webhook را صدا می‌زند تا کش ISR فرانت‌اند پاک شود.
              </p>
            </div>
          </div>
          <Badge tone={webhookOk ? 'success' : 'warning'}>{webhookOk ? 'فعال' : 'تنظیم نشده'}</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <label className="field-label" htmlFor="revalidate-webhook-url">
              آدرس Webhook
            </label>
            <input
              id="revalidate-webhook-url"
              className="field-input"
              dir="ltr"
              placeholder={view?.default_webhook_url ?? 'https://rostami.app/api/revalidate'}
              value={form.revalidateWebhookUrl}
              onChange={(e) => patch({ revalidateWebhookUrl: e.target.value })}
            />
            {view?.env_fallback.revalidate_webhook_url && !form.revalidateWebhookUrl.trim() && (
              <p className="mt-1 text-caption text-text-muted">fallback از env: REVALIDATE_WEBHOOK_URL</p>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className="field-label" htmlFor="revalidate-secret">
              Secret مشترک
            </label>
            <input
              id="revalidate-secret"
              type="password"
              className="field-input"
              dir="ltr"
              autoComplete="new-password"
              placeholder={view?.has_revalidate_secret ? 'برای تغییر، Secret جدید وارد کنید' : 'یک رمز طولانی و تصادفی'}
              value={form.revalidateSecretInput}
              onChange={(e) => patch({ revalidateSecretInput: e.target.value })}
            />
            {view?.has_revalidate_secret && !form.revalidateSecretInput && view.revalidate_secret_preview && (
              <p className="mt-1 text-caption text-success" dir="ltr">
                ذخیره‌شده: {view.revalidate_secret_preview}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => onTest('webhook')}
            className="btn btn-secondary px-4 py-2 text-small"
          >
            {testing === 'webhook' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            تست Webhook
          </button>
        </div>
      </div>

      <div
        className={cn(
          'card p-6',
          activeProvider !== 'arvan' && 'opacity-80',
        )}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3 text-primary-dark">تنظیمات ابر آروان</h2>
            <p className="mt-1 text-small text-text-muted">
              API Key از پنل آروان → API Keys (دسترسی CDN / Purge).
            </p>
          </div>
          <Badge tone={view?.arvan_configured ? 'success' : 'warning'}>
            {view?.arvan_configured ? 'اعتبارنامه OK' : 'ناقص'}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="arvan-domain">
              دامنه اصلی
            </label>
            <input
              id="arvan-domain"
              className="field-input"
              dir="ltr"
              placeholder="rostami.app"
              value={form.arvanDomain}
              onChange={(e) => patch({ arvanDomain: e.target.value })}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="arvan-media-domain">
              دامنه رسانه
            </label>
            <input
              id="arvan-media-domain"
              className="field-input"
              dir="ltr"
              placeholder="cdn.rostami.app"
              value={form.arvanMediaDomain}
              onChange={(e) => patch({ arvanMediaDomain: e.target.value })}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="field-label" htmlFor="arvan-api-key">
              API Key (Purge)
            </label>
            <input
              id="arvan-api-key"
              type="password"
              className="field-input"
              dir="ltr"
              autoComplete="new-password"
              placeholder={view?.has_arvan_api_key ? 'برای تغییر، کلید جدید وارد کنید' : 'Apikey از پنل آروان'}
              value={form.arvanApiKeyInput}
              onChange={(e) => patch({ arvanApiKeyInput: e.target.value })}
            />
            {view?.has_arvan_api_key && !form.arvanApiKeyInput && view.arvan_api_key_preview && (
              <p className="mt-1 text-caption text-success" dir="ltr">
                ذخیره‌شده: {view.arvan_api_key_preview}
              </p>
            )}
            {view?.env_fallback.arvan_api_key && !view.has_arvan_api_key && !form.arvanApiKeyInput.trim() && (
              <p className="mt-1 text-caption text-text-muted">fallback از env: ARVAN_API_KEY</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => onTest('arvan')}
            className="btn btn-secondary px-4 py-2 text-small"
          >
            {testing === 'arvan' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            تست اتصال Arvan
          </button>
        </div>
      </div>

      <div
        className={cn(
          'card p-6',
          activeProvider !== 'cloudflare' && 'opacity-80',
        )}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3 text-primary-dark">تنظیمات Cloudflare</h2>
            <p className="mt-1 text-small text-text-muted">
              Zone ID + API Token با دسترسی Cache Purge.
            </p>
          </div>
          <Badge tone={view?.cloudflare_configured ? 'success' : 'warning'}>
            {view?.cloudflare_configured ? 'اعتبارنامه OK' : 'ناقص'}
          </Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="cf-zone-id">
              Zone ID
            </label>
            <input
              id="cf-zone-id"
              className="field-input"
              dir="ltr"
              placeholder="abc123..."
              value={form.cloudflareZoneId}
              onChange={(e) => patch({ cloudflareZoneId: e.target.value })}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="cf-api-token">
              API Token
            </label>
            <input
              id="cf-api-token"
              type="password"
              className="field-input"
              dir="ltr"
              autoComplete="new-password"
              placeholder={view?.has_cloudflare_api_token ? 'برای تغییر، Token جدید وارد کنید' : 'Cloudflare API Token'}
              value={form.cloudflareApiTokenInput}
              onChange={(e) => patch({ cloudflareApiTokenInput: e.target.value })}
            />
            {view?.has_cloudflare_api_token && !form.cloudflareApiTokenInput && view.cloudflare_api_token_preview && (
              <p className="mt-1 text-caption text-success" dir="ltr">
                ذخیره‌شده: {view.cloudflare_api_token_preview}
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={testing !== null}
            onClick={() => onTest('cloudflare')}
            className="btn btn-secondary px-4 py-2 text-small"
          >
            {testing === 'cloudflare' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            تست اتصال Cloudflare
          </button>
        </div>
      </div>
    </div>
  );
}
