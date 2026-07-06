/** Cache integration settings (ISR webhook + Cloudflare CDN). */

export type CacheIntegrationsEnvFallback = {
  revalidate_webhook_url: boolean;
  revalidate_secret: boolean;
  cloudflare_zone_id: boolean;
  cloudflare_api_token: boolean;
};

export type CacheIntegrationsView = {
  revalidate_webhook_url: string;
  default_webhook_url: string;
  has_revalidate_secret: boolean;
  revalidate_secret_preview: string | null;
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
  cloudflareZoneId: string;
  cloudflareApiTokenInput: string;
};

export const DEFAULT_CACHE_INTEGRATIONS_FORM: CacheIntegrationsForm = {
  revalidateWebhookUrl: '',
  revalidateSecretInput: '',
  cloudflareZoneId: '',
  cloudflareApiTokenInput: '',
};

export function integrationsViewToForm(view: CacheIntegrationsView): CacheIntegrationsForm {
  return {
    revalidateWebhookUrl: view.revalidate_webhook_url,
    revalidateSecretInput: '',
    cloudflareZoneId: view.cloudflare_zone_id,
    cloudflareApiTokenInput: '',
  };
}
