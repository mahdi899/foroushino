import { sitePhotos } from '@/lib/site-photo-paths';

const slugCardFallback: Record<string, string> = {
  'campaign-writing': sitePhotos.mainPathCampaign,
  saat: sitePhotos.mainPathSaat,
  'reference-kanal-mrgf': sitePhotos.mainPathReference,
};

const landingHrefCardFallback: Record<string, string> = {
  '/course/campaign-writing': sitePhotos.mainPathCampaign,
  '/saat': sitePhotos.mainPathSaat,
  '/saat#apply': sitePhotos.mainPathSaat,
  '/reference-channels/kanal-mrgf': sitePhotos.mainPathReference,
};

const slugCardMobileFallback: Record<string, string> = {
  'campaign-writing': sitePhotos.mainPathCampaign,
  saat: sitePhotos.mainPathSaat,
  'reference-kanal-mrgf': sitePhotos.mainPathReferenceMobile,
};

const slugHeroFallback: Record<string, string> = {
  'campaign-writing': sitePhotos.landscapeSession,
  saat: sitePhotos.saatHero,
};

const slugHeroMobileFallback: Record<string, string> = {
  'campaign-writing': sitePhotos.campaignWritingHeroMobile,
  saat: sitePhotos.saatHero,
};

type ProductImageInput = {
  featured_image?: string | null;
  featured_image_mobile?: string | null;
  landing_hero_image?: string | null;
  landing_hero_image_mobile?: string | null;
  slug?: string | null;
  landing_href?: string | null;
};

/** Site fallback when a product has no stored featured image. */
export function resolveProductSiteFeaturedImage({
  slug,
  landing_href,
}: Omit<ProductImageInput, 'featured_image'>): string {
  const href = landing_href?.trim();
  if (href && landingHrefCardFallback[href]) return landingHrefCardFallback[href]!;

  const key = slug?.trim();
  if (key && slugCardFallback[key]) return slugCardFallback[key]!;

  return sitePhotos.landscapeSession;
}

/** Image shown on storefront cards (stored value or site fallback). */
export function resolveProductFeaturedImage(input: ProductImageInput): string {
  if (input.featured_image?.trim()) return input.featured_image.trim();
  return resolveProductSiteFeaturedImage(input);
}

export function resolveProductSiteFeaturedImageMobile(input: Omit<ProductImageInput, 'featured_image'>): string {
  const key = input.slug?.trim();
  if (key && slugCardMobileFallback[key]) return slugCardMobileFallback[key]!;
  return resolveProductSiteFeaturedImage(input);
}

export function resolveProductFeaturedImageMobile(input: ProductImageInput): string {
  if (input.featured_image_mobile?.trim()) return input.featured_image_mobile.trim();
  if (input.featured_image?.trim()) return input.featured_image.trim();
  return resolveProductSiteFeaturedImageMobile(input);
}

export function resolveProductSiteHeroImage(input: Omit<ProductImageInput, 'featured_image'>): string {
  const key = input.slug?.trim();
  if (key && slugHeroFallback[key]) return slugHeroFallback[key]!;
  return sitePhotos.landscapeSession;
}

export function resolveProductHeroImage(input: ProductImageInput): string {
  if (input.landing_hero_image?.trim()) return input.landing_hero_image.trim();
  return resolveProductSiteHeroImage(input);
}

export function resolveProductSiteHeroImageMobile(input: Omit<ProductImageInput, 'featured_image'>): string {
  const key = input.slug?.trim();
  if (key && slugHeroMobileFallback[key]) return slugHeroMobileFallback[key]!;
  return resolveProductSiteHeroImage(input);
}

export function resolveProductHeroImageMobile(input: ProductImageInput): string {
  if (input.landing_hero_image_mobile?.trim()) return input.landing_hero_image_mobile.trim();
  if (input.landing_hero_image?.trim()) return input.landing_hero_image.trim();
  return resolveProductSiteHeroImageMobile(input);
}
