'use client';

import { usePathname } from 'next/navigation';
import { Analytics } from '@/components/analytics/Analytics';
import { SiteFooter } from '@/components/nav/SiteFooter';
import { SiteNav } from '@/components/nav/SiteNav';

export function AdminAwareChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  const isFilament = pathname?.startsWith('/manage');

  if (isAdmin || isFilament) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteNav />
      <div className="relative z-[2] min-w-0 max-w-full pt-14 md:pt-16">{children}</div>
      <SiteFooter />
      <Analytics />
    </>
  );
}
