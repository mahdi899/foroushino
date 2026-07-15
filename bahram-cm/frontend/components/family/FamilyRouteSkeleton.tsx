/** In-shell skeleton while family route loads — no full-page overlay. */
export function FamilyRouteSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 animate-pulse">
      <aside
        aria-hidden
        className="family-sidebar hidden h-full w-[min(100%,280px)] shrink-0 flex-col px-4 py-5 lg:flex lg:px-5 lg:py-6"
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
