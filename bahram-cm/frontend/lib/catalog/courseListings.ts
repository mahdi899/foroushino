import { site } from '@/content/site';
import { getProducts, getPublicProductBySlug, type ProductListItem } from '@/lib/services/products';
import {
  resolveProductFeaturedImage,
  resolveProductFeaturedImageMobile,
  resolveProductSiteFeaturedImage,
} from '@/lib/catalog/productFeaturedImage';

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
  imageMobile?: string;
  imageAlt: string;
};

const defaultPathImages: Record<string, string> = {
  '/course/campaign-writing': resolveProductSiteFeaturedImage({ slug: 'campaign-writing' }),
  '/saat': resolveProductSiteFeaturedImage({ slug: 'saat' }),
  '/saat#apply': resolveProductSiteFeaturedImage({ slug: 'saat', landing_href: '/saat#apply' }),
  '/reference-channels/kanal-mrgf': resolveProductSiteFeaturedImage({
    slug: 'reference-kanal-mrgf',
    landing_href: '/reference-channels/kanal-mrgf',
  }),
};

/** Products that power path cards even when `show_on_courses` is false. */
const pathProductSlugs: Record<string, string> = {
  '/course/campaign-writing': 'campaign-writing',
  '/saat': 'saat',
  '/saat#apply': 'saat',
  '/reference-channels/kanal-mrgf': 'reference-kanal-mrgf',
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
  '/saat#apply': {
    level: 'سیستم عملیاتی',
    duration: 'مسیر WAP',
    featured: false,
  },
  '/reference-channels/kanal-mrgf': {
    level: 'مسیر فروش',
    duration: 'محصول + آموزش',
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

/**
 * Merge listed courses with marketing-path products (e.g. reference channel)
 * so admin cover updates appear on /courses and home path cards.
 */
async function getPathProductsByHref(): Promise<Map<string, ProductListItem>> {
  const map = await getListedProductsByHref();

  await Promise.all(
    Object.entries(pathProductSlugs).map(async ([href, slug]) => {
      if (map.has(href)) return;
      const result = await getPublicProductBySlug(slug);
      if (!result.ok) return;
      map.set(href, result.data);
    }),
  );

  return map;
}

export async function getCourseCatalogCards(): Promise<CourseCatalogCard[]> {
  const byHref = await getPathProductsByHref();

  return site.mainPaths.items.map((item) => {
    const product =
      byHref.get(item.href) ??
      (item.href.startsWith('/saat') ? byHref.get('/saat') ?? byHref.get('/saat#apply') : undefined);
    const meta = staticPathMeta[item.href] ?? {
      level: 'مسیر آموزشی',
      duration: '—',
      featured: false,
    };
    const defaultImage = defaultPathImages[item.href] ?? resolveProductSiteFeaturedImage({});
    const image = product
      ? resolveProductFeaturedImage({
          featured_image: product.featured_image,
          slug: product.slug,
          landing_href: product.landing_href,
        })
      : defaultImage;
    const imageMobile = product
      ? resolveProductFeaturedImageMobile({
          featured_image: product.featured_image,
          featured_image_mobile: product.featured_image_mobile,
          slug: product.slug,
          landing_href: product.landing_href,
        })
      : image;

    return {
      href: item.href,
      label: product?.title?.trim() || item.label,
      tagline: product?.short_description?.trim() || item.tagline,
      subtitle: product?.short_description?.trim() || item.tagline,
      cta: item.cta,
      level: meta.level,
      duration: meta.duration,
      featured: meta.featured,
      image,
      imageMobile,
      imageAlt: product?.featured_image_alt || `کاور ${product?.title?.trim() || item.label}`,
    };
  });
}

/** Admin overrides for marketing path cards (title, summary, covers). */
export async function getCoursePathOverrides(): Promise<{
  images: Record<string, string>;
  imagesMobile: Record<string, string>;
  labels: Record<string, string>;
  taglines: Record<string, string>;
}> {
  const byHref = await getPathProductsByHref();
  const images: Record<string, string> = {};
  const imagesMobile: Record<string, string> = {};
  const labels: Record<string, string> = {};
  const taglines: Record<string, string> = {};

  for (const href of Object.keys(defaultPathImages)) {
    images[href] = defaultPathImages[href]!;
    imagesMobile[href] = defaultPathImages[href]!;
  }

  for (const [href, product] of byHref) {
    images[href] = resolveProductFeaturedImage({
      featured_image: product.featured_image,
      slug: product.slug,
      landing_href: product.landing_href,
    });
    imagesMobile[href] = resolveProductFeaturedImageMobile({
      featured_image: product.featured_image,
      featured_image_mobile: product.featured_image_mobile,
      slug: product.slug,
      landing_href: product.landing_href,
    });
    if (product.title?.trim()) labels[href] = product.title.trim();
    if (product.short_description?.trim()) taglines[href] = product.short_description.trim();
  }

  if (labels['/saat'] && !labels['/saat#apply']) labels['/saat#apply'] = labels['/saat'];
  if (labels['/saat#apply'] && !labels['/saat']) labels['/saat'] = labels['/saat#apply'];
  if (taglines['/saat'] && !taglines['/saat#apply']) taglines['/saat#apply'] = taglines['/saat'];
  if (taglines['/saat#apply'] && !taglines['/saat']) taglines['/saat'] = taglines['/saat#apply'];
  if (images['/saat'] && !images['/saat#apply']) images['/saat#apply'] = images['/saat'];
  if (images['/saat#apply'] && !images['/saat']) images['/saat'] = images['/saat#apply'];
  if (imagesMobile['/saat'] && !imagesMobile['/saat#apply']) {
    imagesMobile['/saat#apply'] = imagesMobile['/saat'];
  }
  if (imagesMobile['/saat#apply'] && !imagesMobile['/saat']) {
    imagesMobile['/saat'] = imagesMobile['/saat#apply'];
  }

  return { images, imagesMobile, labels, taglines };
}

/** @deprecated Use getCoursePathOverrides().images */
export async function getCoursePathImages(): Promise<Record<string, string>> {
  const { images } = await getCoursePathOverrides();
  return images;
}
