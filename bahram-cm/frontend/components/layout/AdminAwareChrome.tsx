'use client';

import { usePathname } from 'next/navigation';
import { AnalyticsGate } from '@/components/analytics/AnalyticsGate';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { SiteFooter } from '@/components/nav/SiteFooter';
import { SiteNav } from '@/components/nav/SiteNav';
import { SitePromoBar } from '@/components/layout/SitePromoBar';
import type { SeminarPromo } from '@/lib/services/seminarPromo';

function isBareShellPath(pathname: string | null | undefined): boolean {
  return Boolean(
    pathname?.startsWith('/admin') ||
      pathname?.startsWith('/panel') ||
      pathname?.startsWith('/family'),
  );
}

export function AdminAwareChrome({
  children,
  promo,
  bareShell,
}: {
  children: React.ReactNode;
  promo?: SeminarPromo | null;
  /** From root layout — covers rostami.club where pathname is `/` not `/family`. */
  bareShell?: boolean;
}) {
  const pathname = usePathname();
  const onFamilyHost =
    typeof document !== 'undefined' && document.documentElement.dataset.familyHost === '1';
  const isBareShell = bareShell ?? (isBareShellPath(pathname) || onFamilyHost);
  const hidePromo =
    pathname?.startsWith('/seminars/') || pathname?.startsWith('/purchase/');

  if (isBareShell) {
    return <>{children}</>;
  }

  return (
    <SmoothScroll>
      {promo && !hidePromo ? <SitePromoBar promo={promo} /> : null}
      <SiteNav />
      <div className="site-chrome-body relative z-[2] min-w-0 w-full max-w-full">
        {children}
        <SiteFooter />
      </div>
      <AnalyticsGate />
    </SmoothScroll>
  );
}
