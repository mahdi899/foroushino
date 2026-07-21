'use client';

import { Cloud, Loader2, ShieldCheck, Server, Zap } from 'lucide-react';
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
  applyingEdge: boolean;
  onChange: (form: CacheIntegrationsForm) => void;
  onTest: (target: 'webhook' | 'arvan' | 'cloudflare') => void;
  onApplyEdge: () => void;
};

export function CacheIntegrationsSettingsSection({
  form,
  view,
  testing,
  applyingEdge,
  onChange,
  onTest,
  onApplyEdge,
}: Props) {
  const webhookOk = view?.webhook_configured ?? false;
  const activeProvider = form.cdnProvider;
  const activeConfigured = view?.cdn_active_configured ?? false;
  const busy = testing !== null || applyingEdge;

  const patch = (partial: Partial<CacheIntegrationsForm>) => onChange({ ...form, ...partial });

  return (
    <div id="cache-integrations" className="space-y-6">
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">CDN لبه (Cloudflare / Arvan)</h2>
              <p className="mt-1 text-small text-text-muted">
                یک ارائه‌دهنده را انتخاب کنید؛ purge خودکار و دستی فقط روی همان اعمال می‌شود.
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
            disabled={busy}
            onClick={() => onTest('webhook')}
            className="btn btn-secondary px-4 py-2 text-small"
          >
            {testing === 'webhook' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            تست Webhook
          </button>
        </div>
      </div>

      <div className={cn('card p-6', activeProvider !== 'arvan' && 'opacity-80')}>
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-h3 text-primary-dark">تنظیمات ابر آروان</h2>
            <p className="mt-1 text-small text-text-muted">API Key از پنل آروان → API Keys (دسترسی CDN / Purge).</p>
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
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => onTest('arvan')}
            className="btn btn-secondary px-4 py-2 text-small"
          >
            {testing === 'arvan' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            تست اتصال Arvan
          </button>
        </div>
      </div>

      <div
        id="cloudflare-credentials"
        className={cn('card p-6 ring-1 ring-accent/20', activeProvider !== 'cloudflare' && 'opacity-80')}
      >
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">Cloudflare — سرعت و امنیت</h2>
              <p className="mt-1 text-small text-text-muted">
                Zone ID و API Token را وارد کنید، ذخیره کنید، سپس «اعمال سرعت و امنیت» را بزنید تا Cache Rules و
                تنظیمات لبه روی rostami.app اعمال شود.
              </p>
            </div>
          </div>
          <Badge tone={view?.cloudflare_configured ? 'success' : 'warning'}>
            {view?.cloudflare_configured ? 'اعتبارنامه OK' : 'ناقص — وارد کنید'}
          </Badge>
        </div>

        <div className="mb-4 rounded-xl border border-border bg-surface-soft/60 p-3 text-caption text-text-muted leading-relaxed">
          <p className="font-medium text-text">Token پیشنهادی (Dashboard → My Profile → API Tokens → Create Token):</p>
          <ul className="mt-2 list-disc space-y-1 pe-5">
            <li>Zone → Zone Settings → Edit</li>
            <li>Zone → Cache Rules / Cache Purge → Edit</li>
            <li>Zone → Zone → Read</li>
            <li>شامل zoneهای rostami.app و در صورت نیاز rostami.club</li>
          </ul>
          <p className="mt-2">
            Zone ID: Dashboard → دامنه → Overview → سمت راست پایین (کپی با یک کلیک).
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="cf-zone-id">
              CLOUDFLARE_ZONE_ID
            </label>
            <input
              id="cf-zone-id"
              className="field-input font-mono text-small"
              dir="ltr"
              placeholder="مثلاً 1a2b3c4d5e6f..."
              value={form.cloudflareZoneId}
              onChange={(e) => patch({ cloudflareZoneId: e.target.value.trim() })}
            />
            <p className="mt-1 text-caption text-text-muted">شناسه Zone دامنه rostami.app</p>
          </div>

          <div>
            <label className="field-label" htmlFor="cf-api-token">
              CLOUDFLARE_API_TOKEN
            </label>
            <input
              id="cf-api-token"
              type="password"
              className="field-input font-mono text-small"
              dir="ltr"
              autoComplete="new-password"
              placeholder={
                view?.has_cloudflare_api_token
                  ? 'برای تغییر، Token جدید وارد کنید'
                  : 'API Token با دسترسی کامل Zone'
              }
              value={form.cloudflareApiTokenInput}
              onChange={(e) => patch({ cloudflareApiTokenInput: e.target.value.trim() })}
            />
            {view?.has_cloudflare_api_token && !form.cloudflareApiTokenInput && view.cloudflare_api_token_preview && (
              <p className="mt-1 text-caption text-success" dir="ltr">
                ذخیره‌شده: {view.cloudflare_api_token_preview}
              </p>
            )}
            {!view?.has_cloudflare_api_token && (
              <p className="mt-1 text-caption text-warning">هنوز Token ذخیره نشده — بعد از وارد کردن، ذخیره تنظیمات را بزنید.</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onTest('cloudflare')}
            className="btn btn-secondary px-4 py-2 text-small"
          >
            {testing === 'cloudflare' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            تست اتصال Cloudflare
          </button>
          <button
            type="button"
            disabled={busy || !view?.cloudflare_configured}
            onClick={onApplyEdge}
            className="btn btn-primary px-4 py-2 text-small"
            title={!view?.cloudflare_configured ? 'اول Zone ID و Token را ذخیره کنید' : undefined}
          >
            {applyingEdge ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            اعمال سرعت و امنیت Cloudflare
          </button>
        </div>
        <p className="mt-3 text-caption text-text-muted leading-relaxed">
          این دکمه Cache Rules (کش HTML + مدیا)، SSL Full strict، HTTPS اجباری، Brotli، HTTP/3، HSTS و خاموش‌کردن
          Rocket Loader را اعمال می‌کند. قبل از اجرا، تنظیمات این بخش را ذخیره کنید.
        </p>
      </div>
    </div>
  );
}
