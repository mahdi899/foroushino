'use client';

import { Cloud, Loader2, Server, Zap } from 'lucide-react';
import { Badge } from '../ui';
import type { CacheIntegrationsForm, CacheIntegrationsView } from '@/lib/cache/integrations.types';

type Props = {
  form: CacheIntegrationsForm;
  view: CacheIntegrationsView | null;
  testing: 'webhook' | 'cloudflare' | null;
  onChange: (form: CacheIntegrationsForm) => void;
  onTest: (target: 'webhook' | 'cloudflare') => void;
};

export function CacheIntegrationsSettingsSection({
  form,
  view,
  testing,
  onChange,
  onTest,
}: Props) {
  const webhookOk = view?.webhook_configured ?? false;
  const cloudflareOk = view?.cloudflare_configured ?? false;

  return (
    <div id="cache-integrations" className="space-y-6">
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
              placeholder={view?.default_webhook_url ?? 'http://localhost:3000/api/revalidate'}
              value={form.revalidateWebhookUrl}
              onChange={(e) => onChange({ ...form, revalidateWebhookUrl: e.target.value })}
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
              onChange={(e) => onChange({ ...form, revalidateSecretInput: e.target.value })}
            />
            {view?.has_revalidate_secret && !form.revalidateSecretInput && view.revalidate_secret_preview && (
              <p className="mt-1 text-caption text-success" dir="ltr">
                ذخیره‌شده: {view.revalidate_secret_preview}
              </p>
            )}
            {view?.env_fallback.revalidate_secret && !view.has_revalidate_secret && !form.revalidateSecretInput.trim() && (
              <p className="mt-1 text-caption text-text-muted">
                fallback از env: REVALIDATE_SECRET — برای Next.js هم می‌توانید همین مقدار را در .env.local قرار دهید
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

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.6} />
            <div>
              <h2 className="text-h3 text-primary-dark">Cloudflare CDN</h2>
              <p className="mt-1 text-small text-text-muted">
                Purge خودکار کش لبه هنگام پاک‌سازی از پنل (نیازمند API Token با دسترسی Zone.Cache Purge).
              </p>
            </div>
          </div>
          <Badge tone={cloudflareOk ? 'success' : 'warning'}>{cloudflareOk ? 'فعال' : 'غیرفعال'}</Badge>
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
              onChange={(e) => onChange({ ...form, cloudflareZoneId: e.target.value })}
            />
            {view?.env_fallback.cloudflare_zone_id && !form.cloudflareZoneId.trim() && (
              <p className="mt-1 text-caption text-text-muted">fallback از env: CLOUDFLARE_ZONE_ID</p>
            )}
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
              onChange={(e) => onChange({ ...form, cloudflareApiTokenInput: e.target.value })}
            />
            {view?.has_cloudflare_api_token && !form.cloudflareApiTokenInput && view.cloudflare_api_token_preview && (
              <p className="mt-1 text-caption text-success" dir="ltr">
                ذخیره‌شده: {view.cloudflare_api_token_preview}
              </p>
            )}
            {view?.env_fallback.cloudflare_api_token && !view.has_cloudflare_api_token && !form.cloudflareApiTokenInput.trim() && (
              <p className="mt-1 text-caption text-text-muted">fallback از env: CLOUDFLARE_API_TOKEN</p>
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
