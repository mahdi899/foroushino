import { sitePhotos } from '@/lib/site-photo-paths';

const slugFallback: Record<string, string> = {
  'campaign-writing': sitePhotos.mainPathCampaign,
  saat: sitePhotos.mainPathSaat,
};

const landingHrefFallback: Record<string, string> = {
  '/course/campaign-writing': sitePhotos.mainPathCampaign,
  '/saat': sitePhotos.mainPathSaat,
};

type ProductImageInput = {
  featured_image?: string | null;
  slug?: string | null;
  landing_href?: string | null;
};

/** Site fallback when a product has no stored featured image. */
export function resolveProductSiteFeaturedImage({
  slug,
  landing_href,
}: Omit<ProductImageInput, 'featured_image'>): string {
  const href = landing_href?.trim();
  if (href && landingHrefFallback[href]) return landingHrefFallback[href];

  const key = slug?.trim();
  if (key && slugFallback[key]) return slugFallback[key];

  return sitePhotos.landscapeSession;
}

/** Image shown on storefront (stored value or site fallback). */
export function resolveProductFeaturedImage(input: ProductImageInput): string {
  if (input.featured_image?.trim()) return input.featured_image.trim();
  return resolveProductSiteFeaturedImage(input);
}
