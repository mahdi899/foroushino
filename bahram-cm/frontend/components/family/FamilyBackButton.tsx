'use client';

import { useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { appPublicOrigin, familyHomeHref, isFamilyFeedHomePath } from '@/lib/domains';

/**
 * Family topbar back control:
 * - Sub-routes (login, notifications page) → family home (rostami.club/)
 * - Feed home + meaningful referrer → browser back
 * - Feed home otherwise → main site (rostami.app)
 */
export function FamilyBackButton() {
  const router = useRouter();
  const pathname = usePathname() ?? '/';

  const handleBack = useCallback(() => {
    const { hostname } = window.location;

    if (!isFamilyFeedHomePath(pathname, hostname)) {
      router.push(familyHomeHref());
      return;
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

    const mainSite = appPublicOrigin();
    if (mainSite) {
      window.location.assign(`${mainSite}/`);
      return;
    }

    router.push(familyHomeHref());
  }, [pathname, router]);

  return (
    <button type="button" onClick={handleBack} aria-label="بازگشت" className="family-topbar__back">
      <ChevronRight className="family-topbar__back-icon" aria-hidden />
    </button>
  );
}
