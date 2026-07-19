import { REVALIDATE } from '@/lib/api/config';

export interface CacheModule {
  id: string;
  label: string;
  description: string;
  settingKey: keyof CacheSettings;
  group: 'cache' | 'loading' | 'tracking' | 'advanced';
  builtin?: boolean;
}

export interface CacheTagGroup {
  id: string;
  label: string;
  tags: string[];
  ttlKey: keyof CacheSettings;
  fallbackSeconds: number;
}

export interface CacheSettings {
  performance_preset: 'aggressive' | 'balanced' | 'fresh';
  developer_mode: boolean;
  page_cache: boolean;
  object_cache: boolean;
  browser_cache: boolean;
  browser_cache_ttl: number;
  cdn_html_cache: boolean;
  cdn_auto_purge: boolean;
  lazy_load_images: boolean;
  lazy_load_chatbot: boolean;
  defer_analytics: boolean;
  defer_below_fold: boolean;
  prefetch_links: boolean;
  auto_purge_on_save: boolean;
  warm_cache_after_purge: boolean;
  gzip_enabled: boolean;
  api_cache_ttl: number;
  ttl_articles: number;
  ttl_cases: number;
  ttl_doctors: number;
  ttl_services: number;
  ttl_settings: number;
  ttl_pricing: number;
  ttl_home: number;
  purge_log?: CachePurgeLogEntry[];
}

export interface CachePurgeLogEntry {
  at: string;
  scope: string;
  actor?: string;
  auto?: boolean;
  label?: string;
  tags: string[];
  paths: string[];
  laravel: boolean;
  arvan: boolean;
  cloudflare: boolean;
  cdn_provider?: 'arvan' | 'cloudflare' | null;
}

export interface CacheStatus {
  laravel_cache_driver: string;
  next_webhook_configured: boolean;
  cdn_provider: 'arvan' | 'cloudflare' | 'none';
  cdn_provider_label: string;
  cdn_configured: boolean;
  arvan_configured: boolean;
  cloudflare_configured: boolean;
  developer_mode: boolean;
  cloudflare_dev_mode: boolean | null;
  modules: Record<string, boolean>;
  isr_tags: string[];
  isr_ttls: Record<string, number>;
  purge_log: CachePurgeLogEntry[];
}

export type CachePanelData = {
  status: CacheStatus;
  settings: CacheSettings;
  backendOk: boolean;
  backendError?: string;
};

export interface PublicPerfConfig {
  developer_mode: boolean;
  page_cache: boolean;
  browser_cache: boolean;
  browser_cache_ttl: number;
  cdn_html_cache: boolean;
  lazy_load_images: boolean;
  lazy_load_chatbot: boolean;
  defer_analytics: boolean;
  defer_below_fold: boolean;
  prefetch_links: boolean;
  ttls: {
    articles: number;
    cases: number;
    doctors: number;
    services: number;
    settings: number;
    pricing: number;
    home: number;
  };
}

export const CACHE_MODULES: CacheModule[] = [
  {
    id: 'page_cache',
    settingKey: 'page_cache',
    group: 'cache',
    label: 'کش صفحه (ISR)',
    description: 'صفحات عمومی (خانه، بلاگ، دوره‌ها) از رندر ازپیش‌ساخته سرو می‌شوند؛ با ذخیره محتوا خودکار بروز می‌شوند',
  },
  {
    id: 'object_cache',
    settingKey: 'object_cache',
    group: 'cache',
    label: 'کش آبجکت (API)',
    description: 'کش پاسخ‌های Laravel در دیتابیس یا Redis',
  },
  {
    id: 'browser_cache',
    settingKey: 'browser_cache',
    group: 'cache',
    label: 'کش مرورگر',
    description: 'هدر Cache-Control برای صفحات عمومی',
  },
  {
    id: 'cdn_html_cache',
    settingKey: 'cdn_html_cache',
    group: 'cache',
    label: 'کش CDN (HTML)',
    description: 'کش لبه CDN برای HTML — Cloudflare یا Arvan',
  },
  {
    id: 'cdn_auto_purge',
    settingKey: 'cdn_auto_purge',
    group: 'cache',
    label: 'پاک‌سازی خودکار CDN',
    description: 'هنگام Purge یا ذخیره محتوا، کش لبه CDN فعال هم خالی شود',
  },
  {
    id: 'lazy_load_images',
    settingKey: 'lazy_load_images',
    group: 'loading',
    label: 'بارگذاری تنبل تصاویر',
    description: 'تصاویر خارج از viewport با تأخیر لود می‌شوند',
  },
  {
    id: 'lazy_load_chatbot',
    settingKey: 'lazy_load_chatbot',
    group: 'loading',
    label: 'بارگذاری تنبل چت‌بات',
    description: 'چت‌بات کامل پس از لود شدن صفحه (و در حالت idle مرورگر) خودکار لود می‌شود',
  },
  {
    id: 'defer_below_fold',
    settingKey: 'defer_below_fold',
    group: 'loading',
    label: 'تأخیر بخش‌های پایین صفحه',
    description: 'نظرات و بخش‌های سنگین صفحه اصلی بعد از LCP لود می‌شوند',
  },
  {
    id: 'prefetch_links',
    settingKey: 'prefetch_links',
    group: 'loading',
    label: 'پیش‌بارگذاری لینک‌ها',
    description: 'Next.js صفحات منو را در پس‌زمینه prefetch می‌کند',
  },
  {
    id: 'defer_analytics',
    settingKey: 'defer_analytics',
    group: 'tracking',
    label: 'تأخیر آنالیتیکس',
    description: 'GA4/GTM پس از لود صفحه اجرا می‌شود (lazyOnload)',
  },
  {
    id: 'gzip_enabled',
    settingKey: 'gzip_enabled',
    group: 'advanced',
    label: 'فشرده‌سازی Gzip/Brotli',
    description: 'در production به‌صورت خودکار فعال است',
    builtin: true,
  },
  {
    id: 'auto_purge_on_save',
    settingKey: 'auto_purge_on_save',
    group: 'advanced',
    label: 'پاک‌سازی خودکار پس از ذخیره',
    description: 'پس از ویرایش محتوا، تگ ISR مرتبط پاک می‌شود',
  },
  {
    id: 'warm_cache_after_purge',
    settingKey: 'warm_cache_after_purge',
    group: 'advanced',
    label: 'گرم‌کردن کش',
    description: 'پس از Purge، صفحات کلیدی دوباره بازدید می‌شوند',
  },
];

export const CACHE_TAG_GROUPS: CacheTagGroup[] = [
  { id: 'home', label: 'صفحه اصلی', tags: ['home', 'pricing', 'products', 'seminars'], ttlKey: 'ttl_home', fallbackSeconds: 600 },
  { id: 'articles', label: 'مقالات', tags: ['articles'], ttlKey: 'ttl_articles', fallbackSeconds: REVALIDATE.articles },
  { id: 'cases', label: 'نمونه کارها', tags: ['cases'], ttlKey: 'ttl_cases', fallbackSeconds: REVALIDATE.cases },
  { id: 'services', label: 'خدمات', tags: ['services'], ttlKey: 'ttl_services', fallbackSeconds: REVALIDATE.services },
  { id: 'settings', label: 'تنظیمات سایت', tags: ['settings'], ttlKey: 'ttl_settings', fallbackSeconds: REVALIDATE.settings },
  { id: 'pricing', label: 'قیمت‌ها', tags: ['pricing'], ttlKey: 'ttl_pricing', fallbackSeconds: REVALIDATE.pricing },
  { id: 'seo', label: 'سئو و سایت‌مپ', tags: ['seo', 'redirects'], ttlKey: 'ttl_settings', fallbackSeconds: 3600 },
  { id: 'faqs', label: 'سوالات متداول', tags: ['faqs', 'public-faqs'], ttlKey: 'ttl_settings', fallbackSeconds: 300 },
  { id: 'testimonials', label: 'نظرات / تبدیل‌ها', tags: ['testimonials', 'public-transformations'], ttlKey: 'ttl_cases', fallbackSeconds: 600 },
  { id: 'mini-courses', label: 'مینی‌دوره‌ها', tags: ['mini-courses', 'public-mini-courses', 'content-comments'], ttlKey: 'ttl_services', fallbackSeconds: 3600 },
  { id: 'chatbot', label: 'چت‌بات', tags: ['chatbot'], ttlKey: 'ttl_settings', fallbackSeconds: 300 },
];

export const CACHE_MODULE_GROUPS = [
  { id: 'cache', label: 'کش سرور' },
  { id: 'loading', label: 'بارگذاری و رندر' },
  { id: 'tracking', label: 'ردیابی و آنالیتیکس' },
  { id: 'advanced', label: 'پیشرفته' },
] as const;

export const DEFAULT_CACHE_SETTINGS: CacheSettings = {
  performance_preset: 'balanced',
  developer_mode: false,
  page_cache: true,
  object_cache: true,
  browser_cache: true,
  browser_cache_ttl: 3600,
  cdn_html_cache: false,
  cdn_auto_purge: false,
  lazy_load_images: true,
  lazy_load_chatbot: true,
  defer_analytics: true,
  defer_below_fold: true,
  prefetch_links: false,
  auto_purge_on_save: true,
  warm_cache_after_purge: false,
  gzip_enabled: true,
  api_cache_ttl: 300,
  ttl_articles: 300,
  ttl_cases: 600,
  ttl_doctors: 3600,
  ttl_services: 3600,
  ttl_settings: 3600,
  ttl_pricing: 600,
  ttl_home: 600,
};

export const DEFAULT_PUBLIC_PERF: PublicPerfConfig = {
  developer_mode: false,
  page_cache: true,
  browser_cache: true,
  browser_cache_ttl: 3600,
  cdn_html_cache: false,
  lazy_load_images: true,
  lazy_load_chatbot: true,
  defer_analytics: true,
  defer_below_fold: true,
  prefetch_links: false,
  ttls: {
    articles: 300,
    cases: 600,
    doctors: 3600,
    services: 3600,
    settings: 3600,
    pricing: 600,
    home: 600,
  },
};

export function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds} ثانیه`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} دقیقه`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} ساعت`;
  return `${Math.round(seconds / 86400)} روز`;
}

export const TTL_FIELDS: { key: keyof CacheSettings; label: string; min: number; max: number }[] = [
  { key: 'ttl_home', label: 'صفحه اصلی', min: 60, max: 86400 },
  { key: 'ttl_articles', label: 'مقالات', min: 60, max: 86400 },
  { key: 'ttl_cases', label: 'نمونه کارها', min: 60, max: 86400 },
  { key: 'ttl_services', label: 'خدمات', min: 60, max: 86400 },
  { key: 'ttl_pricing', label: 'قیمت‌ها', min: 60, max: 86400 },
  { key: 'ttl_settings', label: 'تنظیمات / سئو', min: 60, max: 86400 },
  { key: 'api_cache_ttl', label: 'کش API (Laravel)', min: 60, max: 86400 },
];
