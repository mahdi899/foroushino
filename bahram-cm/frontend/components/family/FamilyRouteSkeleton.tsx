/** In-shell skeleton while family route loads — no full-page overlay. */
export function FamilyRouteSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-1 animate-pulse">
      <aside
        aria-hidden
        className="hidden h-full w-[min(100%,280px)] shrink-0 flex-col family-sidebar px-5 py-9 lg:flex"
      >
        <div className="mx-auto h-28 w-28 rounded-full family-skeleton" />
        <div className="family-skeleton mx-auto mt-5 h-4 w-36 rounded-full" />
        <div className="family-skeleton mx-auto mt-3 h-3 w-44 rounded-full opacity-70" />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="family-panel-header flex shrink-0 items-center gap-2 border-b px-5 py-3">
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-bone/15 border-t-gold/70" />
          <span className="text-[13px] text-bone/45">در حال بارگذاری…</span>
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
