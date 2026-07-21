/**
 * Routes that are statically cached (ISR) — content reads only, no forms.
 * Checkout, chat, auth, and admin stay dynamic (no-store / force-dynamic).
 */
export const STATIC_CONTENT_PREFIXES = [
  '/',
  '/insights',
  '/articles',
  '/transformations',
  '/faq',
  '/courses',
  '/founder',
  '/mini-courses',
  '/events',
  '/guides',
  '/resources',
  '/seminars',
  '/sitemap.xml',
  '/sitemaps',
  '/robots.txt',
  '/llms.txt',
] as const;

/** Always dynamic — never ISR HTML cache. */
export const DYNAMIC_ROUTE_PREFIXES = [
  '/admin',
  '/panel',
  '/family',
  '/purchase',
  '/apply',
  '/sso',
  '/telegram',
  '/api/admin',
  '/api/captcha',
  '/api/chatbot',
  '/api/revalidate',
] as const;

export function isStaticContentPath(pathname: string): boolean {
  if (DYNAMIC_ROUTE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return false;
  }
  return STATIC_CONTENT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
