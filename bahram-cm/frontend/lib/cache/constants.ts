/** ISR tags used across Next.js and Laravel cache orchestration. */
export const CACHE_ISR_TAGS = [
  'articles',
  'cases',
  'doctors',
  'services',
  'settings',
  'pricing',
  'seo',
  'redirects',
  'faqs',
  'testimonials',
  'chatbot',
] as const;

export const CACHE_WARM_PATHS = ['/', '/blog', '/cases', '/pricing', '/sitemap.xml', '/robots.txt'] as const;
