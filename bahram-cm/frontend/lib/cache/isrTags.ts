/** ISR tags shared with Laravel CacheService::ISR_TAGS — keep in sync. */
export const ISR_TAGS = [
  'articles',
  'article',
  'cases',
  'doctors',
  'services',
  'settings',
  'pricing',
  'seo',
  'redirects',
  'faqs',
  'public-faqs',
  'testimonials',
  'public-transformations',
  'chatbot',
  'home',
  'mini-courses',
  'public-mini-courses',
  'content-comments',
  'seminars',
  'products',
] as const;

export type IsrTag = (typeof ISR_TAGS)[number];

export function articleTag(slug: string): string {
  return `article:${slug}`;
}
