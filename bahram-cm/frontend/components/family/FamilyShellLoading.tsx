import { SiteLoader } from '@/components/layout/SiteLoader';

/** Family frame skeleton + inset loader (sidebar/topbar stay visible). */
export function FamilyShellLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
      <header
        aria-hidden
        className="family-topbar flex shrink-0 items-center gap-3 border-b px-4 py-3 lg:hidden"
      >
        <div className="family-skeleton h-11 w-11 rounded-full" />
        <div className="space-y-2">
          <div className="family-skeleton h-3.5 w-28 rounded-full" />
          <div className="family-skeleton h-3 w-16 rounded-full opacity-70" />
        </div>
      </header>

      <aside
        aria-hidden
        className="family-sidebar hidden h-full w-[min(100%,280px)] shrink-0 flex-col border-e px-4 py-5 lg:flex lg:px-5 lg:py-6"
      >
        <div className="flex h-8 items-center gap-1 border-b border-bone/[0.06] pb-3">
          <div className="family-skeleton h-8 min-w-0 flex-1 rounded-lg opacity-50" />
          <div className="family-skeleton h-8 min-w-0 flex-1 rounded-lg opacity-60" />
          <div className="family-skeleton h-7 w-[2.75rem] shrink-0 rounded-pill opacity-40" />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="family-skeleton h-28 w-28 rounded-full" />
          <div className="family-skeleton mt-6 h-4 w-36 rounded-full" />
          <div className="family-skeleton mt-3 h-3 w-44 rounded-full opacity-70" />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="site-route-loading site-route-loading--family flex-1">
          <SiteLoader size="md" variant="page" label="" />
        </div>
      </div>
    </div>
  );
}
