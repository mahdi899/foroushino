export const FEATURED_TRANSFORMATION_SLUGS = [
  'sara-r',
  'amir-h',
  'nazanin-k',
  'reza-m',
] as const;

export type FeaturedTransformationSlug = (typeof FEATURED_TRANSFORMATION_SLUGS)[number];

export function isFeaturedTransformation(slug: string): slug is FeaturedTransformationSlug {
  return (FEATURED_TRANSFORMATION_SLUGS as readonly string[]).includes(slug);
}

/** Featured slugs first (stable order), then every other active testimonial. */
export function sortFeaturedTransformations<T extends { slug: string }>(items: T[]): T[] {
  const bySlug = new Map(items.map((item) => [item.slug, item]));
  const featured = FEATURED_TRANSFORMATION_SLUGS.flatMap((slug) => {
    const item = bySlug.get(slug);
    return item ? [item] : [];
  });
  const rest = items.filter((item) => !isFeaturedTransformation(item.slug));

  return [...featured, ...rest];
}
