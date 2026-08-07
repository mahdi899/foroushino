/** Gallery-managed site assets — canonical paths under Laravel storage. */
export const SITE_MEDIA_STORAGE_PREFIX = '/storage/media/site' as const;

export function siteStorageMedia(filename: string): string {
  return `${SITE_MEDIA_STORAGE_PREFIX}/${filename.replace(/^\/+/, '')}`;
}

export const NOT_FOUND_IMAGE = siteStorageMedia('og-default.svg');
export const SITE_FAVICON_IMAGE = siteStorageMedia('logo-bahram.webp');
export const HERO_IMAGE = siteStorageMedia('hero-ambient.svg');
export const FOUNDER_IMAGE = siteStorageMedia('founder-portrait.svg');
export const LOGO_IMAGE = siteStorageMedia('logo-bahram.webp');

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
  'family-chat-pattern': {
    src: siteStorageMedia('family-chat-pattern.svg'),
    label: 'الگوی پس‌زمینه خانواده — تکرار (لایت/دارک)',
    category: 'خانواده',
  },
  'family-chat-pattern-dark': {
    src: siteStorageMedia('family-chat-pattern.svg'),
    label: 'الگوی پس‌زمینه خانواده — تکرار (قدیمی)',
    category: 'خانواده',
  },
  'family-chat-wallpaper-dark': {
    src: siteStorageMedia('family-chat-wallpaper-dark.webp'),
    label: 'پس‌زمینه فید خانواده — دارک',
    category: 'خانواده',
  },
  'family-chat-wallpaper-light': {
    src: siteStorageMedia('family-chat-wallpaper-light.webp'),
    label: 'پس‌زمینه فید خانواده — لایت',
    category: 'خانواده',
  },
  'family-chat-wallpaper': {
    src: siteStorageMedia('family-chat-wallpaper-dark.webp'),
    label: 'پس‌زمینه فید خانواده — دارک (قدیمی)',
    category: 'خانواده',
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
  'reference-channel-hero': {
    src: siteStorageMedia('reference-channel-hero.webp'),
    label: 'هیرو کانال مرجع — دسکتاپ',
    category: 'دوره‌ها',
  },
  'reference-channel-hero-mobile': {
    src: siteStorageMedia('reference-channel-hero-mobile.webp'),
    label: 'هیرو کانال مرجع — موبایل',
    category: 'دوره‌ها',
  },
  'reference-channel-why': {
    src: siteStorageMedia('reference-channel-why.webp'),
    label: 'کارت و سکشن کانال مرجع — عمودی',
    category: 'دوره‌ها',
  },
  'seminar-zaferaniyeh-cover': {
    src: siteStorageMedia('seminar-zaferaniyeh-cover.webp'),
    label: 'سمینار زعفرانیه — کاور دسکتاپ',
    category: 'سمینار',
  },
  'seminar-zaferaniyeh-cover-mobile': {
    src: siteStorageMedia('seminar-zaferaniyeh-cover-mobile.webp'),
    label: 'سمینار زعفرانیه — کاور موبایل',
    category: 'سمینار',
  },
  'founder': { src: siteStorageMedia('founder-portrait.svg'), label: 'تصویر بهرام', category: 'درباره' },
  'logo-bahram': {
    src: siteStorageMedia('logo-bahram.webp'),
    label: 'لوگوی رسمی بهرام',
    category: 'برند',
  },
  'logo': { src: siteStorageMedia('logo.svg'), label: 'لوگو (گرافیک SVG)', category: 'برند' },
  'og-default': { src: siteStorageMedia('og-default.svg'), label: 'تصویر اشتراک‌گذاری', category: 'سئو' },
  'course-mockup': { src: siteStorageMedia('course-mockup.svg'), label: 'ماکاپ دوره', category: 'دوره‌ها' },
  'app-home': { src: siteStorageMedia('app-home.svg'), label: 'اپ — صفحه اصلی', category: 'سات' },
  'saat-hero': {
    src: siteStorageMedia('saat-hero.webp'),
    label: 'هیرو سات — دسکتاپ',
    category: 'سات',
  },
  'saat-hero-mobile': {
    src: siteStorageMedia('saat-hero.webp'),
    label: 'هیرو سات — موبایل (پیش‌فرض همان دسکتاپ تا آپلود جدا)',
    category: 'سات',
  },
  'main-path-saat': {
    src: siteStorageMedia('main-path-saat.webp'),
    label: 'کارت مسیر سات — دسکتاپ',
    category: 'سات',
  },
  'main-path-saat-mobile': {
    src: siteStorageMedia('main-path-saat.webp'),
    label: 'کارت مسیر سات — موبایل',
    category: 'سات',
  },
  'main-path-campaign': {
    src: siteStorageMedia('main-path-campaign.webp'),
    label: 'کارت مسیر کمپین‌نویسی — دسکتاپ',
    category: 'دوره‌ها',
  },
  'main-path-campaign-mobile': {
    src: siteStorageMedia('main-path-campaign.webp'),
    label: 'کارت مسیر کمپین‌نویسی — موبایل',
    category: 'دوره‌ها',
  },
  'academy-app-home': {
    src: siteStorageMedia('academy-app-home.webp'),
    label: 'پیش‌نمایش مینی‌اپ سات',
    category: 'سات',
  },
  'academy-app-leads': {
    src: siteStorageMedia('academy-app-leads.webp'),
    label: 'اپ سات — لیدها / مشتریان تیم',
    category: 'سات',
  },
  'academy-app-sales': {
    src: siteStorageMedia('academy-app-sales.webp'),
    label: 'اپ سات — فروش‌ها',
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
  'seminar-promo-desktop-available': {
    src: siteStorageMedia('seminar-promo-desktop-available.webp'),
    label: 'بنر سمینار — دسکتاپ (ظرفیت باز)',
    category: 'سمینار',
  },
  'seminar-promo-desktop-full': {
    src: siteStorageMedia('seminar-promo-desktop-full.webp'),
    label: 'بنر سمینار — دسکتاپ (تکمیل ظرفیت)',
    category: 'سمینار',
  },
  'seminar-promo-mobile-available': {
    src: siteStorageMedia('seminar-promo-mobile-available.webp'),
    label: 'بنر سمینار — موبایل (ظرفیت باز)',
    category: 'سمینار',
  },
  'seminar-promo-mobile-full': {
    src: siteStorageMedia('seminar-promo-mobile-full.webp'),
    label: 'بنر سمینار — موبایل (تکمیل ظرفیت)',
    category: 'سمینار',
  },
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
