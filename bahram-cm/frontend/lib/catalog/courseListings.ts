import { site } from '@/content/site';
import { getProducts, type ProductListItem } from '@/lib/services/products';
import { sitePhotos } from '@/lib/site-photo-paths';

export type CourseCatalogCard = {
  href: string;
  label: string;
  tagline: string;
  subtitle: string;
  cta: string;
  level: string;
  duration: string;
  featured: boolean;
  image: string;
  imageAlt: string;
};

const defaultPathImages: Record<string, string> = {
  '/course/campaign-writing': sitePhotos.mainPathCampaign,
  '/saat': sitePhotos.mainPathSaat,
};

const staticPathMeta: Record<string, { level: string; duration: string; featured: boolean }> = {
  '/course/campaign-writing': {
    level: 'مسیر حرفه‌ای',
    duration: '۱۰ فصل',
    featured: true,
  },
  '/saat': {
    level: 'سیستم عملیاتی',
    duration: 'مسیر WAP',
    featured: false,
  },
};

function productHref(product: ProductListItem): string {
  return product.landing_href || `/course/${product.slug}`;
}

async function getListedProductsByHref(): Promise<Map<string, ProductListItem>> {
  const listed = await getProducts({ listed: true });
  const map = new Map<string, ProductListItem>();

  if (!listed.ok) return map;

  for (const product of listed.data) {
    map.set(productHref(product), product);
  }

  return map;
}

export async function getCourseCatalogCards(): Promise<CourseCatalogCard[]> {
  const byHref = await getListedProductsByHref();

  return site.mainPaths.items.map((item) => {
    const product = byHref.get(item.href);
    const meta = staticPathMeta[item.href] ?? {
      level: 'مسیر آموزشی',
      duration: '—',
      featured: false,
    };
    const defaultImage = defaultPathImages[item.href] ?? sitePhotos.landscapeSession;

    return {
      href: item.href,
      label: product?.title?.trim() || item.label,
      tagline: product?.short_description?.trim() || item.tagline,
      subtitle: product?.short_description?.trim() || item.tagline,
      cta: item.cta,
      level: meta.level,
      duration: meta.duration,
      featured: meta.featured,
      image: product?.featured_image || defaultImage,
      imageAlt: product?.featured_image_alt || `کاور ${product?.title?.trim() || item.label}`,
    };
  });
}

/** Admin overrides for marketing path cards (image, title, summary only). */
export async function getCoursePathOverrides(): Promise<{
  images: Record<string, string>;
  labels: Record<string, string>;
  taglines: Record<string, string>;
}> {
  const byHref = await getListedProductsByHref();
  const images: Record<string, string> = {};
  const labels: Record<string, string> = {};
  const taglines: Record<string, string> = {};

  for (const [href, product] of byHref) {
    if (product.featured_image) images[href] = product.featured_image;
    if (product.title?.trim()) labels[href] = product.title.trim();
    if (product.short_description?.trim()) taglines[href] = product.short_description.trim();
  }

  return { images, labels, taglines };
}

/** @deprecated Use getCoursePathOverrides().images */
export async function getCoursePathImages(): Promise<Record<string, string>> {
  const { images } = await getCoursePathOverrides();
  return images;
}
