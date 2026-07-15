/** In-shell skeleton while family route loads — no full-page overlay. */
export function FamilyRouteSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 animate-pulse">
      <aside aria-hidden className="family-sidebar hidden h-full w-[min(100%,300px)] shrink-0 flex-col lg:flex">
        <div className="family-sidebar__inner">
          <div className="family-sidebar__toolbar">
            <div className="family-skeleton h-9 w-9 shrink-0 rounded-full opacity-60" />
            <div className="family-skeleton h-9 w-9 shrink-0 rounded-full opacity-50" />
            <span className="family-sidebar__toolbar-spacer" />
            <div className="family-skeleton h-7 w-[2.75rem] shrink-0 rounded-pill opacity-40" />
          </div>
          <div className="family-sidebar__body">
            <div className="family-skeleton h-24 w-24 rounded-full" />
            <div className="family-skeleton mt-6 h-[7.5rem] w-full max-w-[15.5rem] rounded-[0.9375rem] opacity-80" />
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="family-panel-header flex shrink-0 items-center justify-center border-b px-5 py-3">
          <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bone/15 border-t-gold/70"
            aria-label="در حال بارگذاری"
          />
        </div>
        <div className="min-h-0 flex-1 space-y-3 px-3 py-4 sm:px-4 lg:px-5 lg:py-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="family-skeleton h-40 rounded-2xl lg:h-44" />
          ))}
        </div>
      </div>
    </div>
  );
}
