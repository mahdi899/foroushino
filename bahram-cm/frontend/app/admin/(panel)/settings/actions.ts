'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import { aiChatCompletionWithRuntime } from '@/lib/ai/client';
import { getAiConfigAdminView, getResolvedAiRuntimeFromDraft, getResolvedChatbotAiRuntimeFromDraft, getResolvedImageSettingsFromDraft, saveAiChatbotConfig, saveAiImageConfig, saveAiTextConfig, type SaveAiChatbotConfigInput, type SaveAiImageConfigInput, type SaveAiTextConfigInput } from '@/lib/ai/settings';
import { adminViewToForm } from '@/lib/captcha/form';
import {
  getCaptchaConfigAdminView,
  saveCaptchaConfig,
} from '@/lib/captcha/settings';
import type { CaptchaSettingsForm } from '@/lib/captcha/types';
import { adminViewToTrackingForm } from '@/lib/tracking/form';
import { getPublicTrackingConfig } from '@/lib/tracking/public';
import {
  getTrackingConfigAdminView,
  saveTrackingConfig,
} from '@/lib/tracking/settings';
import type { TrackingSettingsForm } from '@/lib/tracking/types';
import {
  loadCacheIntegrations,
  saveCacheIntegrationsAction,
} from '@/lib/cache/integrations';
import {
  integrationsViewToForm,
  type CacheIntegrationsForm,
} from '@/lib/cache/integrations.types';
import {
  loadImageOptimizerSettings,
  saveImageOptimizerSettingsAction,
} from '@/lib/media/imageOptimizer';
import {
  DEFAULT_IMAGE_OPTIMIZER_FORM,
  imageOptimizerViewToForm,
  type ImageOptimizerForm,
} from '@/lib/media/imageOptimizer.types';
import type { AiErrorDetail, AiImageSettings, AiProvider } from '@/lib/ai/types';
import { generateAiImageWithSettings } from '@/lib/ai/images';
import { filterGeminiModels, listGeminiModels, type GeminiModelInfo } from '@/lib/ai/geminiModels';
import { getStoredAiConfig } from '@/lib/ai/settings';
import { providerMeta } from '@/lib/ai/types';

export async function getSiteSettings(): Promise<Record<string, unknown>> {
  try {
    const res = await adminFetch<{ data: Record<string, unknown> }>('/settings/site');
    return res.data ?? {};
  } catch {
    return {};
  }
}

export async function saveSiteSettings(values: Record<string, unknown>): Promise<{ ok: boolean }> {
  try {
    await adminFetch('/settings/site', { method: 'PUT', body: { values } });
    revalidateTag('settings', 'max');
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function loadAiSettings() {
  return getAiConfigAdminView();
}

export async function persistAiTextSettings(
  input: SaveAiTextConfigInput,
): Promise<{ ok: boolean; error?: string }> {
  const res = await saveAiTextConfig(input);
  if (res.ok) revalidateTag('settings', 'max');
  return res;
}

export async function persistAiChatbotSettings(
  input: SaveAiChatbotConfigInput,
): Promise<{ ok: boolean; error?: string }> {
  const res = await saveAiChatbotConfig(input);
  if (res.ok) revalidateTag('settings', 'max');
  return res;
}

export async function testChatbotConnection(input: SaveAiChatbotConfigInput): Promise<
  | { ok: true; model: string; provider: string }
  | { ok: false; error: string; detail?: AiErrorDetail }
> {
  const runtime = await getResolvedChatbotAiRuntimeFromDraft({
    provider: input.chatbot.provider,
    model: input.chatbot.model,
    baseUrl: input.chatbot.baseUrl,
    temperature: input.chatbot.temperature,
    apiKeyInput: input.apiKeyInput,
  });
  const res = await aiChatCompletionWithRuntime(runtime, {
    messages: [
      { role: 'system', content: 'Reply with exactly: ok' },
      { role: 'user', content: 'ping' },
    ],
    temperature: 0,
  });
  if (!res.ok) return { ok: false, error: res.error, detail: res.detail };
  return { ok: true, model: res.model, provider: res.provider };
}

export async function persistAiImageSettings(
  input: SaveAiImageConfigInput,
): Promise<{ ok: boolean; error?: string }> {
  const res = await saveAiImageConfig(input);
  if (res.ok) revalidateTag('settings', 'max');
  return res;
}

/** @deprecated use persistAiTextSettings or persistAiImageSettings */
export async function persistAiSettings(
  input: SaveAiTextConfigInput & { image?: SaveAiImageConfigInput['image'] },
): Promise<{ ok: boolean; error?: string }> {
  const textRes = await persistAiTextSettings(input);
  if (!textRes.ok || !input.image) return textRes;
  return persistAiImageSettings({ image: input.image });
}

export async function loadCaptchaSettings(): Promise<{
  form: CaptchaSettingsForm;
  meta: Awaited<ReturnType<typeof getCaptchaConfigAdminView>>;
}> {
  const meta = await getCaptchaConfigAdminView();
  return { form: adminViewToForm(meta), meta };
}

export async function persistCaptchaSettings(
  form: CaptchaSettingsForm,
): Promise<{ ok: boolean; error?: string }> {
  const res = await saveCaptchaConfig(form);
  if (res.ok) revalidateTag('settings', 'max');
  return res;
}

export async function loadTrackingSettings(): Promise<{
  form: TrackingSettingsForm;
  meta: Awaited<ReturnType<typeof getTrackingConfigAdminView>>;
  publicConfig: Awaited<ReturnType<typeof getPublicTrackingConfig>>;
}> {
  const [meta, publicConfig] = await Promise.all([getTrackingConfigAdminView(), getPublicTrackingConfig()]);
  return { form: adminViewToTrackingForm(meta), meta, publicConfig };
}

export async function persistTrackingSettings(
  form: TrackingSettingsForm,
): Promise<{ ok: boolean; error?: string }> {
  const res = await saveTrackingConfig(form);
  if (res.ok) {
    revalidateTag('settings', 'max');
    revalidatePath('/admin/seo');
  }
  return res;
}

export async function loadCacheIntegrationsSettings(): Promise<{
  form: CacheIntegrationsForm;
  view: Awaited<ReturnType<typeof loadCacheIntegrations>>;
}> {
  const view = await loadCacheIntegrations();
  return {
    form: view ? integrationsViewToForm(view) : integrationsViewToForm({
      revalidate_webhook_url: '',
      default_webhook_url: 'http://localhost:3000/api/revalidate',
      has_revalidate_secret: false,
      revalidate_secret_preview: null,
      cloudflare_zone_id: '',
      has_cloudflare_api_token: false,
      cloudflare_api_token_preview: null,
      webhook_configured: false,
      cloudflare_configured: false,
      env_fallback: {
        revalidate_webhook_url: false,
        revalidate_secret: false,
        cloudflare_zone_id: false,
        cloudflare_api_token: false,
      },
    }),
    view,
  };
}

export async function persistCacheIntegrationsSettings(
  form: CacheIntegrationsForm,
): Promise<{ ok: boolean; error?: string }> {
  const res = await saveCacheIntegrationsAction(form);
  if (res.ok) revalidateTag('settings', 'max');
  return res;
}

export async function loadImageOptimizerSettingsPanel(): Promise<{
  form: ImageOptimizerForm;
  view: Awaited<ReturnType<typeof loadImageOptimizerSettings>>;
}> {
  const view = await loadImageOptimizerSettings();
  return {
    form: view ? imageOptimizerViewToForm(view) : DEFAULT_IMAGE_OPTIMIZER_FORM,
    view,
  };
}

export async function persistImageOptimizerSettings(
  form: ImageOptimizerForm,
): Promise<{ ok: boolean; error?: string }> {
  const res = await saveImageOptimizerSettingsAction(form);
  if (res.ok) revalidateTag('settings', 'max');
  return res;
}

export async function testAiConnection(input: {
  enabled: boolean;
  provider: AiProvider;
  model: string;
  baseUrl: string;
  temperature: number;
  apiKeyInput?: string;
}): Promise<
  | { ok: true; model: string; provider: string }
  | { ok: false; error: string; detail?: AiErrorDetail }
> {
  const runtime = await getResolvedAiRuntimeFromDraft(input);
  const res = await aiChatCompletionWithRuntime(runtime, {
    messages: [
      { role: 'system', content: 'Reply with exactly: ok' },
      { role: 'user', content: 'ping' },
    ],
    temperature: 0,
  });

  if (!res.ok) return { ok: false, error: res.error, detail: res.detail };
  return { ok: true, model: res.model, provider: res.provider };
}

export async function testAiImageGeneration(input: {
  image: AiImageSettings;
  geminiApiKeyInput?: string;
  openaiApiKeyInput?: string;
  baseUrl?: string;
}): Promise<
  | { ok: true; url: string; model: string; provider: string }
  | { ok: false; error: string }
> {
  const settings = await getResolvedImageSettingsFromDraft({
    image: input.image,
    geminiApiKeyInput: input.geminiApiKeyInput,
    openaiApiKeyInput: input.openaiApiKeyInput,
    baseUrl: input.baseUrl,
  });
  const res = await generateAiImageWithSettings(settings, {
    prompt: 'modern luxury dental clinic interior, bright and clean, test photo',
    purpose: 'inline',
    alt: 'تست تولید تصویر AI',
  });
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, url: res.url, model: res.model, provider: res.provider };
}

export async function fetchGeminiModels(input?: {
  geminiApiKeyInput?: string;
  baseUrl?: string;
  filter?: 'chat' | 'image' | 'all';
}): Promise<
  | { ok: true; models: GeminiModelInfo[] }
  | { ok: false; error: string }
> {
  const stored = await getStoredAiConfig();
  const apiKey =
    input?.geminiApiKeyInput?.trim() ||
    stored.image?.googleApiKey?.trim() ||
    stored.providers.gemini.apiKey?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    '';

  const baseUrl =
    input?.baseUrl?.trim() ||
    stored.image?.baseUrl?.trim() ||
    stored.providers.gemini.baseUrl?.trim() ||
    providerMeta('gemini').defaultBaseUrl;

  const res = await listGeminiModels(apiKey, baseUrl);
  if (!res.ok) return res;

  const filter = input?.filter ?? 'all';
  return { ok: true, models: filterGeminiModels(res.models, filter) };
}

export async function loadSmsRoutingConfig() {
  const { loadSmsCenterConfig } = await import('@/lib/admin/smsCenter');
  return loadSmsCenterConfig();
}
