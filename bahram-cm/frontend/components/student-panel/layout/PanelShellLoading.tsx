import { SiteLoader } from '@/components/layout/SiteLoader';

/** Panel chrome skeleton + inset loader (sidebar/header stay visible). */
export function PanelShellLoading() {
  return (
    <div className="panel-shell h-[100dvh]">
      <aside
        aria-hidden
        className="panel-sidebar fixed inset-y-0 right-0 z-20 hidden w-64 flex-col border-s lg:flex"
      >
        <div className="panel-sidebar__scroll space-y-2 p-4">
          <div className="mb-4 flex items-center gap-3 px-2 py-2">
            <div className="h-9 w-9 animate-pulse rounded-lg bg-[var(--color-surface-soft)]" />
            <div className="h-4 w-28 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
          </div>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-soft)] opacity-70"
            />
          ))}
        </div>
      </aside>

      <div className="panel-main flex min-w-0 flex-col">
        <header aria-hidden className="panel-header">
          <div className="panel-header__lead flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            <div className="hidden h-4 w-24 animate-pulse rounded-full bg-[var(--color-surface-soft)] sm:block" />
          </div>
          <div className="panel-header__trail flex items-center gap-2">
            <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
            <div className="h-9 w-9 animate-pulse rounded-full bg-[var(--color-surface-soft)]" />
          </div>
        </header>

        <main className="panel-main-content">
          <div className="panel-page-wrap site-route-loading site-route-loading--panel-inset">
            <SiteLoader size="md" variant="page" label="در حال بارگذاری..." />
          </div>
        </main>
      </div>

      <nav
        aria-hidden
        className="site-bottom-nav panel-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 lg:hidden"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center justify-center gap-1 py-2">
            <div className="h-5 w-5 animate-pulse rounded-full bg-[var(--color-surface-soft)] opacity-50" />
            <div className="h-2 w-8 animate-pulse rounded-full bg-[var(--color-surface-soft)] opacity-40" />
          </div>
        ))}
      </nav>
    </div>
  );
}
