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
    const path = pathname.startsWith('/family')
      ? pathname.replace(/^\/family/, '') || '/'
      : pathname || '/';
    return `${path}${search}`;
  }

  return search ? `/family${search}` : '/family';
}

export function familyNotificationsHref(): string {
  return FAMILY_DOMAIN ? '/notifications' : '/family/notifications';
}

export function isFamilyBareShell(pathname: string, hostname?: string): boolean {
  if (pathname.startsWith('/admin') || pathname.startsWith('/panel') || pathname.startsWith('/family')) {
    return true;
  }
  return Boolean(hostname && isFamilyHost(hostname));
}

export function resolveFamilyLoginRedirect(target?: string, hostname?: string): string {
  const onClub = hostname ? isFamilyHost(hostname) : false;

  if (!target || target.startsWith('//')) {
    return onClub ? '/' : '/family';
  }

  if (!target.startsWith('/')) {
    return onClub ? '/' : '/family';
  }

  if (onClub) {
    if (target.startsWith('/family')) {
      return target.replace(/^\/family/, '') || '/';
    }
    return target;
  }

  if (target.startsWith('/family')) return target;
  if (target === '/' || target === '') return '/family';

  return `/family${target}`;
}
