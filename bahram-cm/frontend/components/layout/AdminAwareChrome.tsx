'use client';

import { usePathname } from 'next/navigation';
import { AnalyticsGate } from '@/components/analytics/AnalyticsGate';
import { SiteFooter } from '@/components/nav/SiteFooter';
import { SiteNav } from '@/components/nav/SiteNav';

export function AdminAwareChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBareShell = pathname?.startsWith('/admin') || pathname?.startsWith('/panel');

  if (isBareShell) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteNav />
      <div className="relative z-[2] min-w-0 w-full max-w-full overflow-x-clip pt-14 md:pt-16">{children}</div>
      <SiteFooter />
      <AnalyticsGate />
    </>
  );
}
