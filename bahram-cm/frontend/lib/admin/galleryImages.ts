import { SITE_MEDIA } from '@/config/media';

export type GalleryImage = {
  src: string;
  label: string;
  category: string;
};

/** Static site assets for admin gallery pickers. */
export function buildStaticGallery(): GalleryImage[] {
  return Object.values(SITE_MEDIA).map((item) => ({
    src: item.src,
    label: item.label,
    category: item.category,
  }));
}

export const ADMIN_GALLERY_CATEGORIES = [
  'همه',
  'عکس‌های سایت',
  'صفحه اصلی',
  'برند',
  'دوره‌ها',
  'سات',
  'بلاگ',
  'رویداد',
  'رضایت',
  'درباره',
  'سئو',
  'آیکون و برند',
  'سایت',
  'آپلود شده',
] as const;
