'use client';

import { usePathname } from 'next/navigation';
import { AnalyticsGate } from '@/components/analytics/AnalyticsGate';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { SiteFooter } from '@/components/nav/SiteFooter';
import { SiteNav } from '@/components/nav/SiteNav';
import { SitePromoBar } from '@/components/layout/SitePromoBar';
import type { SeminarPromo } from '@/lib/services/seminarPromo';
import type { ChatbotPublicContacts } from '@/lib/chatbot/types';

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
  contacts,
}: {
  children: React.ReactNode;
  promo?: SeminarPromo | null;
  /** From root layout — covers rostami.club where pathname is `/` not `/family`. */
  bareShell?: boolean;
  /** Social contact channels from /admin/chatbot — drives footer links. */
  contacts?: ChatbotPublicContacts | null;
}) {
  const pathname = usePathname();
  const onFamilyHost =
    typeof document !== 'undefined' && document.documentElement.dataset.familyHost === '1';
  // On the client, prefer live pathname / family-host dataset. The server `bareShell`
  // prop can lag one RSC pass after soft-nav from /panel|/admin|/family → `/`, which
  // left the marketing site without SiteNav/SiteFooter until a full reload.
  const isBareShell =
    isBareShellPath(pathname) ||
    onFamilyHost ||
    (typeof document === 'undefined' && Boolean(bareShell));
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
        <SiteFooter contacts={contacts} />
      </div>
      <AnalyticsGate />
    </SmoothScroll>
  );
}
