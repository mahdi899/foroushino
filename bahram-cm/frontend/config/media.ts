/** Gallery-managed site assets — canonical paths under Laravel storage. */
export const SITE_MEDIA_STORAGE_PREFIX = '/storage/media/site' as const;

export function siteStorageMedia(filename: string): string {
  return `${SITE_MEDIA_STORAGE_PREFIX}/${filename.replace(/^\/+/, '')}`;
}

export const NOT_FOUND_IMAGE = siteStorageMedia('og-default.svg');
export const SITE_FAVICON_IMAGE = siteStorageMedia('portrait-founder.webp');
export const HERO_IMAGE = siteStorageMedia('hero-ambient.svg');
export const FOUNDER_IMAGE = siteStorageMedia('founder-portrait.svg');
export const LOGO_IMAGE = siteStorageMedia('logo.svg');

export const SITE_MEDIA: Record<string, { src: string; label: string; category: string }> = {
  'hero-ambient': { src: siteStorageMedia('hero-ambient.svg'), label: 'پس‌زمینه هیرو (گرافیک)', category: 'صفحه اصلی' },
  'hero-light': { src: siteStorageMedia('hero-ambient-light.svg'), label: 'هیرو روشن (گرافیک)', category: 'صفحه اصلی' },
  'hero-background': {
    src: siteStorageMedia('hero-background.webp'),
    label: 'پس‌زمینه هیرو — دسکتاپ',
    category: 'صفحه اصلی',
  },
  'hero-background-mobile': {
    src: siteStorageMedia('hero-background-mobile.webp'),
    label: 'پس‌زمینه هیرو — موبایل',
    category: 'صفحه اصلی',
  },
  'portrait-founder': {
    src: siteStorageMedia('portrait-founder.webp'),
    label: 'پرتره بنیان‌گذار',
    category: 'درباره',
  },
  'founder-hero-desktop': {
    src: siteStorageMedia('founder-hero-desktop.webp'),
    label: 'هیرو بنیان‌گذار — دسکتاپ',
    category: 'درباره',
  },
  'founder-aside-portrait': {
    src: siteStorageMedia('founder-aside-portrait.webp'),
    label: 'کارت بنیان‌گذار — صفحه اصلی',
    category: 'درباره',
  },
  'portrait-founder-mobile': {
    src: siteStorageMedia('portrait-founder-mobile.webp'),
    label: 'هیرو بنیان‌گذار — موبایل',
    category: 'درباره',
  },
  'founder-letter': {
    src: siteStorageMedia('founder-letter.webp'),
    label: 'پس‌زمینه نامه بنیان‌گذار',
    category: 'درباره',
  },
  'campaign-writing-hero': {
    src: siteStorageMedia('landscape-session.webp'),
    label: 'هیرو کمپین‌نویسی — دسکتاپ',
    category: 'دوره‌ها',
  },
  'campaign-writing-hero-mobile': {
    src: siteStorageMedia('campaign-writing-hero-mobile.webp'),
    label: 'هیرو کمپین‌نویسی — موبایل',
    category: 'دوره‌ها',
  },
  'founder': { src: siteStorageMedia('founder-portrait.svg'), label: 'تصویر بهرام', category: 'درباره' },
  'logo': { src: siteStorageMedia('logo.svg'), label: 'لوگو', category: 'برند' },
  'og-default': { src: siteStorageMedia('og-default.svg'), label: 'تصویر اشتراک‌گذاری', category: 'سئو' },
  'course-mockup': { src: siteStorageMedia('course-mockup.svg'), label: 'ماکاپ دوره', category: 'دوره‌ها' },
  'app-home': { src: siteStorageMedia('app-home.svg'), label: 'اپ — صفحه اصلی', category: 'سات' },
  'academy-app-home': {
    src: siteStorageMedia('academy-app-home.webp'),
    label: 'پیش‌نمایش مینی‌اپ سات',
    category: 'سات',
  },
  'app-path': { src: siteStorageMedia('app-path.svg'), label: 'اپ — مسیر', category: 'سات' },
  'app-atelier': { src: siteStorageMedia('app-atelier.svg'), label: 'اپ — آتلیه', category: 'سات' },
  'insight-1': { src: siteStorageMedia('insight-cover-1.svg'), label: 'کاور بلاگ ۱', category: 'بلاگ' },
  'insight-2': { src: siteStorageMedia('insight-cover-2.svg'), label: 'کاور بلاگ ۲', category: 'بلاگ' },
  'insight-3': { src: siteStorageMedia('insight-cover-3.svg'), label: 'کاور بلاگ ۳', category: 'بلاگ' },
  'event-1': { src: siteStorageMedia('event-cover-1.svg'), label: 'کاور رویداد ۱', category: 'رویداد' },
  'event-2': { src: siteStorageMedia('event-cover-2.svg'), label: 'کاور رویداد ۲', category: 'رویداد' },
  'avatar-sara': { src: siteStorageMedia('avatar-sara.svg'), label: 'آواتار سارا', category: 'رضایت' },
  'avatar-amir': { src: siteStorageMedia('avatar-amir.svg'), label: 'آواتار امیر', category: 'رضایت' },
  'avatar-nazanin': { src: siteStorageMedia('avatar-nazanin.svg'), label: 'آواتار نازنین', category: 'رضایت' },
  'signature': { src: siteStorageMedia('signature.svg'), label: 'امضا', category: 'برند' },
  'trust-enamad': { src: siteStorageMedia('trust-enamad.webp'), label: 'نماد اعتماد الکترونیکی', category: 'اعتماد' },
  'trust-samandehi': { src: siteStorageMedia('trust-samandehi.webp'), label: 'ساماندهی', category: 'اعتماد' },
  'trust-zarinpal': { src: siteStorageMedia('trust-zarinpal.webp'), label: 'زرین‌پال', category: 'اعتماد' },
};

export function resolveMainServiceImage(slug: string, fallback?: string | null): string {
  return SITE_MEDIA[slug]?.src ?? fallback ?? NOT_FOUND_IMAGE;
}

export function resolveServiceHeaderImage(slug: string, fallback?: string | null): string {
  return resolveMainServiceImage(slug, fallback);
}

export function resolveClientImage(_name: string, fallback?: string | null): string {
  return fallback ?? siteStorageMedia('avatar-sara.svg');
}
