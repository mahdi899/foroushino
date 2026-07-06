'use server';

import { adminFetch } from '@/lib/auth/session';
import type { CacheIntegrationsForm, CacheIntegrationsView } from './integrations.types';

export async function loadCacheIntegrations(): Promise<CacheIntegrationsView | null> {
  try {
    const res = await adminFetch<{ data: CacheIntegrationsView }>('/manage/cache/integrations');
    return res.data;
  } catch {
    return null;
  }
}

export async function saveCacheIntegrationsAction(
  form: CacheIntegrationsForm,
): Promise<{ ok: boolean; data?: CacheIntegrationsView; error?: string }> {
  try {
    const res = await adminFetch<{ data: CacheIntegrationsView }>('/manage/cache/integrations', {
      method: 'PUT',
      body: {
        revalidate_webhook_url: form.revalidateWebhookUrl.trim(),
        revalidate_secret_input: form.revalidateSecretInput.trim(),
        cloudflare_zone_id: form.cloudflareZoneId.trim(),
        cloudflare_api_token_input: form.cloudflareApiTokenInput.trim(),
      },
    });
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'خطا در ذخیره تنظیمات' };
  }
}

export async function testCacheIntegrationAction(
  target: 'webhook' | 'cloudflare',
): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await adminFetch<{ data: { ok: boolean; message: string } }>(
      '/manage/cache/integrations/test',
      { method: 'POST', body: { target } },
    );
    return res.data;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'خطا در تست اتصال' };
  }
}
