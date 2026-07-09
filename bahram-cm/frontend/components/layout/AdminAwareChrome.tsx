'use client';

import { usePathname } from 'next/navigation';
import { AnalyticsGate } from '@/components/analytics/AnalyticsGate';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { SiteFooter } from '@/components/nav/SiteFooter';
import { SiteNav } from '@/components/nav/SiteNav';
import { SitePromoBar } from '@/components/layout/SitePromoBar';
import type { SeminarPromo } from '@/lib/services/seminarPromo';

export function AdminAwareChrome({
  children,
  promo,
}: {
  children: React.ReactNode;
  promo?: SeminarPromo | null;
}) {
  const pathname = usePathname();
  const isBareShell = pathname?.startsWith('/admin') || pathname?.startsWith('/panel');
  const hidePromo =
    pathname?.startsWith('/seminars/') || pathname?.startsWith('/purchase/');

  if (isBareShell) {
    return <>{children}</>;
  }

  return (
    <SmoothScroll>
      {promo && !hidePromo ? <SitePromoBar promo={promo} /> : null}
      <SiteNav />
      <div className="relative z-[2] min-w-0 w-full max-w-full">
        {children}
      </div>
      <SiteFooter />
      <AnalyticsGate />
    </SmoothScroll>
  );
}
