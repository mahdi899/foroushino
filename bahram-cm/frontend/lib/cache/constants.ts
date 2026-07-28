/** ISR tags used across Next.js and Laravel cache orchestration. */
export const CACHE_ISR_TAGS = [
  'articles',
  'cases',
  'services',
  'settings',
  'pricing',
  'seo',
  'redirects',
  'faqs',
  'public-faqs',
  'public-transformations',
  'testimonials',
  'mini-courses',
  'public-mini-courses',
  'chatbot',
] as const;

export const CACHE_WARM_PATHS = [
  '/',
  '/insights',
  '/transformations',
  '/faq',
  '/courses',
  '/course/campaign-writing',
  '/reference-channels/kanal-mrgf',
  '/seminars',
  '/sitemap.xml',
  '/robots.txt',
  '/llms.txt',
] as const;
