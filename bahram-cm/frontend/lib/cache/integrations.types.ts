/** Cache integration settings (ISR webhook + Cloudflare / Arvan CDN). */

export type CdnProvider = 'arvan' | 'cloudflare' | 'none';

export type CacheIntegrationsEnvFallback = {
  revalidate_webhook_url: boolean;
  revalidate_secret: boolean;
  arvan_domain: boolean;
  arvan_media_domain: boolean;
  arvan_api_key: boolean;
  cloudflare_zone_id: boolean;
  cloudflare_api_token: boolean;
  cdn_provider: boolean;
};

export type CacheIntegrationsView = {
  revalidate_webhook_url: string;
  default_webhook_url: string;
  has_revalidate_secret: boolean;
  revalidate_secret_preview: string | null;
  cdn_provider: CdnProvider;
  cdn_provider_label: string;
  cdn_active_configured: boolean;
  active_cdn_provider: CdnProvider | null;
  arvan_domain: string;
  arvan_media_domain: string;
  has_arvan_api_key: boolean;
  arvan_api_key_preview: string | null;
  arvan_configured: boolean;
  cloudflare_zone_id: string;
  has_cloudflare_api_token: boolean;
  cloudflare_api_token_preview: string | null;
  webhook_configured: boolean;
  cloudflare_configured: boolean;
  env_fallback: CacheIntegrationsEnvFallback;
};

export type CacheIntegrationsForm = {
  revalidateWebhookUrl: string;
  revalidateSecretInput: string;
  cdnProvider: CdnProvider;
  arvanDomain: string;
  arvanMediaDomain: string;
  arvanApiKeyInput: string;
  cloudflareZoneId: string;
  cloudflareApiTokenInput: string;
};

export const DEFAULT_CACHE_INTEGRATIONS_FORM: CacheIntegrationsForm = {
  revalidateWebhookUrl: '',
  revalidateSecretInput: '',
  cdnProvider: 'cloudflare',
  arvanDomain: 'rostami.app',
  arvanMediaDomain: 'cdn.rostami.app',
  arvanApiKeyInput: '',
  cloudflareZoneId: '',
  cloudflareApiTokenInput: '',
};

export function integrationsViewToForm(view: CacheIntegrationsView): CacheIntegrationsForm {
  return {
    revalidateWebhookUrl: view.revalidate_webhook_url,
    revalidateSecretInput: '',
    cdnProvider: view.cdn_provider ?? 'none',
    arvanDomain: view.arvan_domain,
    arvanMediaDomain: view.arvan_media_domain,
    arvanApiKeyInput: '',
    cloudflareZoneId: view.cloudflare_zone_id,
    cloudflareApiTokenInput: '',
  };
}

export const CDN_PROVIDER_OPTIONS: { id: CdnProvider; label: string; hint: string }[] = [
  { id: 'cloudflare', label: 'Cloudflare', hint: 'پیشنهادی — Zone ID + API Token برای کش HTML، purge و امنیت لبه' },
  { id: 'arvan', label: 'ابر آروان', hint: 'CDN داخلی ایران — API Key + دامنه' },
  { id: 'none', label: 'غیرفعال', hint: 'فقط ISR و کش Laravel — بدون purge لبه' },
];
