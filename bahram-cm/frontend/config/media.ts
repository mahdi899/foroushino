/** Site media assets under /public/media — Bahram brand. */
export const NOT_FOUND_IMAGE = '/media/og-default.svg';
export const HERO_IMAGE = '/media/hero-ambient.svg';
export const FOUNDER_IMAGE = '/media/founder-portrait.svg';
export const LOGO_IMAGE = '/media/logo.svg';

export const SITE_MEDIA: Record<string, { src: string; label: string; category: string }> = {
  'hero-ambient': { src: '/media/hero-ambient.svg', label: 'پس‌زمینه هیرو', category: 'صفحه اصلی' },
  'hero-light': { src: '/media/hero-ambient-light.svg', label: 'هیرو روشن', category: 'صفحه اصلی' },
  'founder': { src: '/media/founder-portrait.svg', label: 'تصویر بهرام', category: 'درباره' },
  'logo': { src: '/media/logo.svg', label: 'لوگو', category: 'برند' },
  'og-default': { src: '/media/og-default.svg', label: 'تصویر اشتراک‌گذاری', category: 'سئو' },
  'course-mockup': { src: '/media/course-mockup.svg', label: 'ماکاپ دوره', category: 'دوره‌ها' },
  'app-home': { src: '/media/app-home.svg', label: 'اپ — صفحه اصلی', category: 'سات' },
  'app-path': { src: '/media/app-path.svg', label: 'اپ — مسیر', category: 'سات' },
  'app-atelier': { src: '/media/app-atelier.svg', label: 'اپ — آتلیه', category: 'سات' },
  'insight-1': { src: '/media/insight-cover-1.svg', label: 'کاور بلاگ ۱', category: 'بلاگ' },
  'insight-2': { src: '/media/insight-cover-2.svg', label: 'کاور بلاگ ۲', category: 'بلاگ' },
  'insight-3': { src: '/media/insight-cover-3.svg', label: 'کاور بلاگ ۳', category: 'بلاگ' },
  'event-1': { src: '/media/event-cover-1.svg', label: 'کاور رویداد ۱', category: 'رویداد' },
  'event-2': { src: '/media/event-cover-2.svg', label: 'کاور رویداد ۲', category: 'رویداد' },
  'avatar-sara': { src: '/media/avatar-sara.svg', label: 'آواتار سارا', category: 'رضایت' },
  'avatar-amir': { src: '/media/avatar-amir.svg', label: 'آواتار امیر', category: 'رضایت' },
  'avatar-nazanin': { src: '/media/avatar-nazanin.svg', label: 'آواتار نازنین', category: 'رضایت' },
  'signature': { src: '/media/signature.svg', label: 'امضا', category: 'برند' },
};

export function resolveMainServiceImage(slug: string, fallback?: string | null): string {
  return SITE_MEDIA[slug]?.src ?? fallback ?? NOT_FOUND_IMAGE;
}

export function resolveServiceHeaderImage(slug: string, fallback?: string | null): string {
  return resolveMainServiceImage(slug, fallback);
}

export function resolveClientImage(_name: string, fallback?: string | null): string {
  return fallback ?? '/media/avatar-sara.svg';
}
