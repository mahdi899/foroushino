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
        className="family-sidebar hidden h-full w-[min(100%,280px)] shrink-0 flex-col border-e px-5 py-9 lg:flex"
      >
        <div className="mx-auto h-28 w-28 rounded-full family-skeleton" />
        <div className="family-skeleton mx-auto mt-5 h-4 w-36 rounded-full" />
        <div className="family-skeleton mx-auto mt-3 h-3 w-44 rounded-full opacity-70" />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="site-route-loading site-route-loading--family flex-1">
          <SiteLoader size="md" variant="page" label="در حال بارگذاری…" />
        </div>
      </div>
    </div>
  );
}
