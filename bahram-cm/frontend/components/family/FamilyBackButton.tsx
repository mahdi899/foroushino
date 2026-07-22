'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  appPublicOrigin,
  DUAL_DOMAIN_ENABLED,
  familyHomeHref,
  isFamilyFeedHomePath,
  isFamilyHost,
  isLoopbackOrigin,
} from '@/lib/domains';

/**
 * Family topbar back control:
 * - Sub-routes (login, notifications page) → family home (rostami.club/)
 * - Feed home on club host → main site (rostami.app) via full navigation
 * - Feed home single-origin → browser back or site root
 */
export function FamilyBackButton({
  className,
  iconClassName,
}: {
  className?: string;
  iconClassName?: string;
} = {}) {
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  const handleBack = useCallback(() => {
    const { hostname } = window.location;

    if (!isFamilyFeedHomePath(pathname, hostname)) {
      router.push(familyHomeHref());
      return;
    }

    // Cross-domain: always hard-navigate so the app host fully reloads (router.back()
    // stays inside the shared Next.js client and leaves the site page unhydrated).
    if (DUAL_DOMAIN_ENABLED && isFamilyHost(hostname)) {
      const mainSite = appPublicOrigin();
      if (mainSite && !isLoopbackOrigin(mainSite)) {
        window.location.assign(`${mainSite}/`);
        return;
      }
    }

    const referrer = document.referrer;
    if (referrer) {
      try {
        const ref = new URL(referrer);
        const samePage =
          ref.hostname === hostname &&
          (ref.pathname.replace(/\/$/, '') || '/') === (pathname.replace(/\/$/, '') || '/');
        if (!samePage) {
          router.back();
          return;
        }
      } catch {
        /* ignore malformed referrer */
      }
    }

    router.push('/');
  }, [pathname, router]);

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="بازگشت"
      title="بازگشت به سایت"
      className={className ?? 'family-topbar__back'}
    >
      <ChevronRight className={iconClassName ?? 'family-topbar__back-icon'} aria-hidden />
    </button>
  );
}
