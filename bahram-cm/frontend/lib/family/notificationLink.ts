import {
  FAMILY_DOMAIN,
  familyPublicOrigin,
  isFamilyHost,
  isLoopbackOrigin,
} from '@/lib/domains';

function isClubNotificationHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (isFamilyHost(host)) return true;
  if (FAMILY_DOMAIN && host === FAMILY_DOMAIN.toLowerCase()) return true;
  if (host.endsWith('.lvh.me') || host === 'lvh.me') {
    const clubOrigin = familyPublicOrigin();
    if (clubOrigin) {
      try {
        return new URL(clubOrigin).hostname.toLowerCase() === host;
      } catch {
        // ignore
      }
    }
  }
  return false;
}

function normalizeLegacyFamilyPath(path: string): string {
  if (path === '/family' || path === '/family/') return '/';
  if (path.startsWith('/family?')) return `/?${path.slice('/family?'.length)}`;
  if (path === '/family/notifications') return '/notifications';
  return path;
}

/**
 * Club in-app navigation path when already on the family host.
 * Absolute club URLs and legacy `/family…` paths are normalized here.
 */
export function resolveFamilyNotificationHref(link: string | null | undefined): string | null {
  if (!link?.trim()) return null;

  let href = link.trim();

  if (href.startsWith('/family')) {
    href = normalizeLegacyFamilyPath(href);
  }

  if (/^https?:\/\//i.test(href)) {
    try {
      const url = new URL(href);

      if (isLoopbackOrigin(href) && typeof window !== 'undefined' && isClubNotificationHost(window.location.hostname)) {
        return normalizeLegacyFamilyPath(url.pathname + url.search + url.hash);
      }

      if (typeof window !== 'undefined' && isClubNotificationHost(url.hostname)) {
        if (isClubNotificationHost(window.location.hostname)) {
          const path = url.pathname + url.search + url.hash;
          return path === '' ? '/' : path;
        }
        return href;
      }

      if (typeof window !== 'undefined' && isClubNotificationHost(window.location.hostname)) {
        const clubOrigin = familyPublicOrigin();
        if (clubOrigin) {
          try {
            const clubHost = new URL(clubOrigin).hostname.toLowerCase();
            if (url.hostname.toLowerCase() === clubHost) {
              const path = url.pathname + url.search + url.hash;
              return path === '' ? '/' : path;
            }
          } catch {
            // ignore
          }
        }
      }

      return href;
    } catch {
      return href;
    }
  }

  return href;
}

/** True when the notification should open the club origin (user is off-channel). */
export function isOffClubFamilyNotificationLink(link: string | null | undefined): boolean {
  const href = link?.trim();
  if (!href || typeof window === 'undefined') return false;
  if (!/^https?:\/\//i.test(href)) return false;
  if (isClubNotificationHost(window.location.hostname)) return false;

  try {
    const url = new URL(href);
    return isClubNotificationHost(url.hostname) || url.hostname.includes('rostami.club');
  } catch {
    return false;
  }
}

export function extractFamilyNotificationPostId(link: string | null | undefined): number | null {
  const href = resolveFamilyNotificationHref(link);
  if (!href) return null;

  const query = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  const raw = params.get('post');
  if (!raw) return null;

  const postId = Number(raw);
  return Number.isFinite(postId) && postId > 0 ? postId : null;
}
