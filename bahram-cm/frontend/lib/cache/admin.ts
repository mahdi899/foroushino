'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import { CACHE_ISR_TAGS, CACHE_WARM_PATHS } from '@/lib/cache/constants';
import type { CachePanelData, CacheSettings, CacheStatus } from '@/lib/cache/types';
import { DEFAULT_CACHE_SETTINGS } from '@/lib/cache/types';
import { mergePresetIntoSettings, type PerformancePresetId } from '@/lib/cache/presets';

function parseBool(v: unknown): boolean {
  return v === true || v === '1' || v === 1;
}

function normalizeSettings(raw: Record<string, unknown>): CacheSettings {
  const preset = raw.performance_preset;
  const validPreset =
    preset === 'aggressive' || preset === 'balanced' || preset === 'fresh' ? preset : DEFAULT_CACHE_SETTINGS.performance_preset;

  return {
    performance_preset: validPreset,
    developer_mode: parseBool(raw.developer_mode ?? DEFAULT_CACHE_SETTINGS.developer_mode),
    page_cache: parseBool(raw.page_cache ?? DEFAULT_CACHE_SETTINGS.page_cache),
    object_cache: parseBool(raw.object_cache ?? DEFAULT_CACHE_SETTINGS.object_cache),
    browser_cache: parseBool(raw.browser_cache ?? DEFAULT_CACHE_SETTINGS.browser_cache),
    browser_cache_ttl: Number(raw.browser_cache_ttl ?? DEFAULT_CACHE_SETTINGS.browser_cache_ttl) || 3600,
    cdn_html_cache: parseBool(raw.cdn_html_cache ?? DEFAULT_CACHE_SETTINGS.cdn_html_cache),
    cloudflare_auto_purge: parseBool(raw.cloudflare_auto_purge ?? DEFAULT_CACHE_SETTINGS.cloudflare_auto_purge),
    lazy_load_images: parseBool(raw.lazy_load_images ?? DEFAULT_CACHE_SETTINGS.lazy_load_images),
    lazy_load_chatbot: parseBool(raw.lazy_load_chatbot ?? DEFAULT_CACHE_SETTINGS.lazy_load_chatbot),
    defer_analytics: parseBool(raw.defer_analytics ?? DEFAULT_CACHE_SETTINGS.defer_analytics),
    defer_below_fold: parseBool(raw.defer_below_fold ?? DEFAULT_CACHE_SETTINGS.defer_below_fold),
    prefetch_links: parseBool(raw.prefetch_links ?? DEFAULT_CACHE_SETTINGS.prefetch_links),
    auto_purge_on_save: parseBool(raw.auto_purge_on_save ?? DEFAULT_CACHE_SETTINGS.auto_purge_on_save),
    warm_cache_after_purge: parseBool(raw.warm_cache_after_purge ?? DEFAULT_CACHE_SETTINGS.warm_cache_after_purge),
    gzip_enabled: parseBool(raw.gz_enabled ?? raw.gzip_enabled ?? DEFAULT_CACHE_SETTINGS.gzip_enabled),
    api_cache_ttl: Number(raw.api_cache_ttl ?? DEFAULT_CACHE_SETTINGS.api_cache_ttl) || 300,
    ttl_articles: Number(raw.ttl_articles ?? DEFAULT_CACHE_SETTINGS.ttl_articles) || 300,
    ttl_cases: Number(raw.ttl_cases ?? DEFAULT_CACHE_SETTINGS.ttl_cases) || 600,
    ttl_doctors: Number(raw.ttl_doctors ?? DEFAULT_CACHE_SETTINGS.ttl_doctors) || 3600,
    ttl_services: Number(raw.ttl_services ?? DEFAULT_CACHE_SETTINGS.ttl_services) || 3600,
    ttl_settings: Number(raw.ttl_settings ?? DEFAULT_CACHE_SETTINGS.ttl_settings) || 3600,
    ttl_pricing: Number(raw.ttl_pricing ?? DEFAULT_CACHE_SETTINGS.ttl_pricing) || 600,
    ttl_home: Number(raw.ttl_home ?? DEFAULT_CACHE_SETTINGS.ttl_home) || 600,
    purge_log: Array.isArray(raw.purge_log) ? raw.purge_log : [],
  };
}

function normalizeStatus(raw: Partial<CacheStatus> | null | undefined, settings: CacheSettings): CacheStatus {
  const modules = raw?.modules ?? {};
  return {
    laravel_cache_driver: raw?.laravel_cache_driver ?? 'نامشخص',
    next_webhook_configured: raw?.next_webhook_configured ?? Boolean(process.env.REVALIDATE_SECRET),
    cloudflare_configured: raw?.cloudflare_configured ?? false,
    developer_mode: parseBool(raw?.developer_mode ?? settings.developer_mode),
    cloudflare_dev_mode: raw?.cloudflare_dev_mode ?? null,
    modules: {
      page_cache: parseBool(modules.page_cache ?? settings.page_cache),
      object_cache: parseBool(modules.object_cache ?? settings.object_cache),
      browser_cache: parseBool(modules.browser_cache ?? settings.browser_cache),
      cdn_html_cache: parseBool(modules.cdn_html_cache ?? settings.cdn_html_cache),
      cloudflare_auto_purge: parseBool(modules.cloudflare_auto_purge ?? settings.cloudflare_auto_purge),
    },
    isr_tags: Array.isArray(raw?.isr_tags) ? raw.isr_tags : [...CACHE_ISR_TAGS],
    isr_ttls: raw?.isr_ttls ?? {},
    purge_log: Array.isArray(raw?.purge_log) ? raw.purge_log : [],
  };
}

function fallbackStatus(settings: CacheSettings): CacheStatus {
  return normalizeStatus(null, settings);
}

async function purgeIsrLocal(tags: string[], paths: string[] = []): Promise<void> {
  for (const tag of tags) revalidateTag(tag, 'max');
  for (const path of paths) revalidatePath(path);
}

function isrScope(scope: string, extra?: { tags?: string[]; paths?: string[] }): { tags: string[]; paths: string[] } {
  if (scope === 'all') {
    return { tags: [...CACHE_ISR_TAGS], paths: [...CACHE_WARM_PATHS] };
  }
  if (scope === 'isr') {
    return { tags: extra?.tags?.length ? extra.tags : [...CACHE_ISR_TAGS], paths: extra?.paths ?? [] };
  }
  if (scope.startsWith('path:')) {
    return { tags: [], paths: [scope.slice(5)] };
  }
  if (scope.startsWith('tag:')) {
    return { tags: [scope.slice(4)], paths: [] };
  }
  return { tags: extra?.tags ?? [], paths: extra?.paths ?? [] };
}

export async function loadCachePanel(): Promise<CachePanelData> {
  try {
    const [statusRes, settingsRes] = await Promise.all([
      adminFetch<{ data: Partial<CacheStatus> }>('/manage/cache/status'),
      adminFetch<{ data: Record<string, unknown> }>('/manage/cache/settings'),
    ]);
    const settings = normalizeSettings(settingsRes.data);
    return {
      status: normalizeStatus(statusRes.data, settings),
      settings,
      backendOk: true,
    };
  } catch (e) {
    const settings = DEFAULT_CACHE_SETTINGS;
    const err = e as Error & { status?: number };
    const msg =
      err.status === 401 || err.status === 403
        ? 'دسترسی به تنظیمات کش ندارید (settings.read)'
        : err instanceof Error
          ? err.message
          : 'اتصال به API برقرار نشد';
    return {
      status: fallbackStatus(settings),
      settings,
      backendOk: false,
      backendError: msg,
    };
  }
}

export async function applyPerformancePresetAction(
  presetId: PerformancePresetId,
  current?: CacheSettings,
): Promise<{ ok: boolean; settings?: CacheSettings; error?: string }> {
  const base = current ?? DEFAULT_CACHE_SETTINGS;
  const merged = mergePresetIntoSettings(base, presetId);
  return saveCacheSettingsAction(merged);
}

export async function saveCacheSettingsAction(settings: Partial<CacheSettings>): Promise<{
  ok: boolean;
  settings?: CacheSettings;
  error?: string;
}> {
  try {
    const res = await adminFetch<{ data: Record<string, unknown> }>('/manage/cache/settings', {
      method: 'PUT',
      body: settings,
    });
    revalidateTag('settings', 'max');
    return { ok: true, settings: normalizeSettings(res.data) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'خطا در ذخیره تنظیمات' };
  }
}

export async function purgeCacheAction(options: {
  scope: string;
  tags?: string[];
  paths?: string[];
  warm?: boolean;
}): Promise<{ ok: boolean; source?: 'laravel' | 'local'; data?: unknown; error?: string }> {
  const isr = isrScope(options.scope, options);

  try {
    const res = await adminFetch<{ data: unknown }>('/manage/cache/purge', {
      method: 'POST',
      body: options,
    });
    return { ok: true, source: 'laravel', data: res.data };
  } catch (laravelErr) {
    const needsIsr = isr.tags.length > 0 || isr.paths.length > 0;
    if (!needsIsr) {
      return {
        ok: false,
        error: laravelErr instanceof Error ? laravelErr.message : 'خطا در پاک‌سازی کش',
      };
    }

    try {
      await purgeIsrLocal(isr.tags, isr.paths);
      return {
        ok: true,
        source: 'local',
        data: { scope: options.scope, isr, note: 'Laravel در دسترس نبود — فقط ISR پاک شد' },
      };
    } catch (localErr) {
      return {
        ok: false,
        error: localErr instanceof Error ? localErr.message : 'خطا در پاک‌سازی ISR',
      };
    }
  }
}

export async function purgeIsrOnlyAction(options: {
  tags?: string[];
  paths?: string[];
  all?: boolean;
}): Promise<{ ok: boolean; tags: string[]; paths: string[] }> {
  const tags = options.all ? [...CACHE_ISR_TAGS] : (options.tags ?? []);
  const paths = options.all ? [...CACHE_WARM_PATHS] : (options.paths ?? []);
  await purgeIsrLocal(tags, paths);
  return { ok: true, tags, paths };
}

export async function toggleDeveloperModeAction(enable: boolean): Promise<{
  ok: boolean;
  settings?: CacheSettings;
  cloudflare_dev_mode?: boolean;
  error?: string;
}> {
  try {
    const res = await adminFetch<{
      data: { settings?: Record<string, unknown>; cloudflare_dev_mode?: boolean };
    }>('/manage/cache/developer-mode', {
      method: 'POST',
      body: { enable },
    });
    revalidateTag('settings', 'max');
    const settings = res.data?.settings ? normalizeSettings(res.data.settings) : undefined;
    return {
      ok: true,
      settings,
      cloudflare_dev_mode: res.data?.cloudflare_dev_mode,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'خطا در تغییر حالت توسعه‌دهنده' };
  }
}
