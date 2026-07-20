/** Dual-domain config: rostami.app (main) + rostami.club (family PWA). */

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim() || '';
export const FAMILY_DOMAIN = process.env.NEXT_PUBLIC_FAMILY_DOMAIN?.trim() || '';

export const DUAL_DOMAIN_ENABLED = Boolean(
  APP_DOMAIN && FAMILY_DOMAIN && APP_DOMAIN !== FAMILY_DOMAIN,
);

export function normalizeHost(hostname: string): string {
  return hostname.split(':')[0]?.toLowerCase() ?? '';
}

export function isFamilyHost(hostname: string): boolean {
  if (!FAMILY_DOMAIN) return false;
  return normalizeHost(hostname) === FAMILY_DOMAIN.toLowerCase();
}

export function familyPublicOrigin(): string {
  return FAMILY_DOMAIN ? `https://${FAMILY_DOMAIN}` : '';
}

/** Public family home — club apex in prod, `/family` on single-origin dev. */
export function familyHomeHref(): string {
  return FAMILY_DOMAIN ? `${familyPublicOrigin()}/` : '/family';
}

/** Browser path after login on the current host (keeps query string). */
export function familyLoginRedirectPath(): string {
  if (typeof window === 'undefined') return '/family';

  const { pathname, search, hostname } = window.location;

  if (isFamilyHost(hostname)) {
    if (pathname === '/login') return `/family${search}`;
    if (pathname.startsWith('/family')) return `${pathname}${search}`;
    if (pathname === '/' || pathname === '') return `/family${search}`;
    return `/family${pathname}${search}`;
  }

  return search ? `/family${search}` : '/family';
}

export function familyNotificationsHref(): string {
  return FAMILY_DOMAIN ? '/notifications' : '/family/notifications';
}

/** Student panel — absolute on club host so RSC prefetch does not hit /family/panel. */
export function studentPanelHref(path = '/panel'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined' && isFamilyHost(window.location.hostname) && APP_DOMAIN) {
    return `https://${APP_DOMAIN}${normalized}`;
  }
  return normalized;
}

export function isFamilyBareShell(pathname: string, hostname?: string): boolean {
  if (pathname.startsWith('/admin') || pathname.startsWith('/panel') || pathname.startsWith('/family')) {
    return true;
  }
  return Boolean(hostname && isFamilyHost(hostname));
}

/** Server-side post-login path — always a Next.js `/family/*` route (not club apex `/`). */
export function resolveFamilyLoginRedirect(target?: string, _hostname?: string): string {
  if (!target || target.startsWith('//')) {
    return '/family';
  }

  if (!target.startsWith('/')) {
    return '/family';
  }

  if (target.startsWith('/family')) {
    if (target === '/family/login' || target === '/family') return target;
    return target;
  }

  if (target === '/login') return '/family/login';
  if (target === '/') return '/family';

  return `/family${target}`;
}
