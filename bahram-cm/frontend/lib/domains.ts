/** Dual-domain config: rostami.app (main) + rostami.club (family PWA). */

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN?.trim() || '';
export const FAMILY_DOMAIN = process.env.NEXT_PUBLIC_FAMILY_DOMAIN?.trim() || '';

export const DUAL_DOMAIN_ENABLED = Boolean(
  APP_DOMAIN && FAMILY_DOMAIN && APP_DOMAIN !== FAMILY_DOMAIN,
);

export function normalizeHost(hostname: string): string {
  return hostname.split(':')[0]?.toLowerCase() ?? '';
}

function isLoopbackHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
}

/** True for dev origins baked into production builds (NEXT_PUBLIC_SITE_URL=localhost). */
export function isLoopbackOrigin(url: string): boolean {
  try {
    return isLoopbackHost(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function isFamilyHost(hostname: string): boolean {
  if (!FAMILY_DOMAIN) return false;
  return normalizeHost(hostname) === FAMILY_DOMAIN.toLowerCase();
}

export function familyPublicOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_FAMILY_SITE_URL?.trim().replace(/\/$/, '');
  if (explicit && !isLoopbackOrigin(explicit)) return explicit;
  if (FAMILY_DOMAIN) return `https://${FAMILY_DOMAIN}`;
  if (typeof window !== 'undefined' && isFamilyHost(window.location.hostname)) {
    return window.location.origin;
  }
  return explicit ?? '';
}

/** Main marketing site — rostami.app in production. */
export function appPublicOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (site && !isLoopbackOrigin(site)) return site;
  if (APP_DOMAIN) return `https://${APP_DOMAIN}`;
  if (typeof window !== 'undefined') {
    const host = normalizeHost(window.location.hostname);
    if (isFamilyHost(host) && APP_DOMAIN) return `https://${APP_DOMAIN}`;
    if (!isLoopbackHost(host)) return window.location.origin;
  }
  return site ?? '';
}

/** True on the family feed home (club `/` or dev `/family`). */
export function isFamilyFeedHomePath(pathname: string, hostname?: string): boolean {
  const path = pathname.replace(/\/$/, '') || '/';
  if (hostname && isFamilyHost(hostname)) {
    return path === '/' || path === '/family';
  }
  return path === '/family';
}

/** Public family home — club apex in prod, `/family` on main app or single-origin dev. */
export function familyHomeHref(hostname?: string): string {
  const host =
    hostname ??
    (typeof window !== 'undefined' ? normalizeHost(window.location.hostname) : '');
  // Stay on rostami.app/family when not on the club host (Iran users + pre-redirect).
  if (host && !isFamilyHost(host)) return '/family';
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
    return `${appPublicOrigin()}${normalized}`;
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
