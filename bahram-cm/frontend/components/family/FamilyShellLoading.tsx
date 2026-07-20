import { PinnedBarSkeleton } from '@/components/family/PinnedBarSkeleton';

/** Bubble placeholders while feed scroll position is prepared (no jump flash). */
export function FamilyFeedBootSkeleton({ className }: { className?: string }) {
  return (
    <div className={className} aria-busy aria-label="در حال بارگذاری فید">
      <div className="family-feed-content mx-auto flex w-full max-w-[680px] flex-col gap-3 px-3 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="family-post-bubble space-y-3 p-3 opacity-80" aria-hidden>
            <div className="family-skeleton h-3 w-24 rounded-full" />
            <div className="family-skeleton h-4 w-full max-w-[85%] rounded-full" />
            <div className="family-skeleton h-4 w-full max-w-[62%] rounded-full opacity-80" />
            <div className="family-skeleton h-28 w-full rounded-2xl opacity-60" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Family frame skeleton while the route RSC resolves (sidebar placeholders). */
export function FamilyShellLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
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
        <div className="family-feed-pane relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="family-feed-chrome-stack">
            <div className="family-feed-chrome-stack__pin">
              <div className="family-feed-chrome-item family-feed-chrome-item--pinned family-feed-chrome-item--pinned-slot">
                <PinnedBarSkeleton />
              </div>
            </div>
          </div>
          <FamilyFeedBootSkeleton className="family-feed-scroll min-h-0 min-w-0 flex-1 overflow-hidden" />
        </div>
      </div>
    </div>
  );
}
