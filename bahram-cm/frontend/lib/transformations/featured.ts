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

export function sortFeaturedTransformations<T extends { slug: string }>(items: T[]): T[] {
  return [...items]
    .filter((item) => isFeaturedTransformation(item.slug))
    .sort(
      (a, b) =>
        FEATURED_TRANSFORMATION_SLUGS.indexOf(a.slug as FeaturedTransformationSlug) -
        FEATURED_TRANSFORMATION_SLUGS.indexOf(b.slug as FeaturedTransformationSlug),
    );
}
