/** Shared pinned-bar placeholder — keeps chrome height stable during fetch. */
export function PinnedBarSkeleton() {
  return (
    <div className="family-pinned-bar family-pinned-bar--skeleton" aria-hidden aria-busy>
      <span className="family-pinned-bar__rail" />
      <span className="family-pinned-bar__body">
        <span className="family-pinned-bar__label-row">
          <span className="family-skeleton family-pinned-skel__label" />
        </span>
        <span className="family-pinned-bar__preview">
          <span className="family-skeleton family-pinned-skel__preview" />
        </span>
      </span>
    </div>
  );
}
