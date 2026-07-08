import type { CacheSettings } from './types';
import { DEFAULT_CACHE_SETTINGS } from './types';

export type PerformancePresetId = 'aggressive' | 'balanced' | 'fresh';

export interface PerformancePreset {
  id: PerformancePresetId;
  label: string;
  description: string;
  hint: string;
  settings: Partial<CacheSettings>;
}

export const PERFORMANCE_PRESETS: PerformancePreset[] = [
  {
    id: 'aggressive',
    label: 'حداکثر سرعت',
    description: 'بهترین عملکرد برای ترافیک بالا — محتوا کمی دیرتر بروز می‌شود.',
    hint: 'TTL بلند + lazy load + آنالیتیکس تأخیری',
    settings: {
      performance_preset: 'aggressive',
      page_cache: true,
      object_cache: true,
      browser_cache: true,
      browser_cache_ttl: 7200,
      lazy_load_images: true,
      lazy_load_chatbot: true,
      defer_analytics: true,
      defer_below_fold: true,
      prefetch_links: false,
      warm_cache_after_purge: true,
      auto_purge_on_save: true,
      cdn_html_cache: true,
      cloudflare_auto_purge: true,
      ttl_articles: 900,
      ttl_cases: 1800,
      ttl_services: 7200,
      ttl_settings: 7200,
      ttl_pricing: 1800,
      ttl_home: 1800,
      api_cache_ttl: 600,
    },
  },
  {
    id: 'balanced',
    label: 'متعادل (پیشنهادی)',
    description: 'تعادل بین سرعت و تازگی محتوا — مناسب اکثر سایت‌ها.',
    hint: 'پیش‌فرض production',
    settings: {
      ...DEFAULT_CACHE_SETTINGS,
      performance_preset: 'balanced',
      cdn_html_cache: true,
      cloudflare_auto_purge: true,
      ttl_articles: 300,
      ttl_cases: 600,
      ttl_services: 3600,
      ttl_settings: 3600,
      ttl_pricing: 600,
      ttl_home: 600,
      api_cache_ttl: 300,
    },
  },
  {
    id: 'fresh',
    label: 'محتوای تازه',
    description: 'بروزرسانی سریع‌تر محتوا — مناسب دوره ویرایش مداوم.',
    hint: 'TTL کوتاه + کش مرورگر کمتر',
    settings: {
      performance_preset: 'fresh',
      page_cache: true,
      object_cache: true,
      browser_cache: true,
      browser_cache_ttl: 300,
      lazy_load_images: true,
      lazy_load_chatbot: false,
      defer_analytics: false,
      defer_below_fold: false,
      prefetch_links: true,
      warm_cache_after_purge: false,
      auto_purge_on_save: true,
      ttl_articles: 120,
      ttl_cases: 300,
      ttl_services: 600,
      ttl_settings: 600,
      ttl_pricing: 300,
      ttl_home: 300,
      api_cache_ttl: 120,
    },
  },
];

export function getPresetById(id: PerformancePresetId): PerformancePreset {
  return PERFORMANCE_PRESETS.find((p) => p.id === id) ?? PERFORMANCE_PRESETS[1];
}

export function mergePresetIntoSettings(
  current: CacheSettings,
  presetId: PerformancePresetId,
): CacheSettings {
  const preset = getPresetById(presetId);
  return { ...current, ...preset.settings };
}
