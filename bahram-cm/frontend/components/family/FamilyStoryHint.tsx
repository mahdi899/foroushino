'use client';

type FamilyStoryHintProps = {
  memberCount?: number;
  memberLabel?: string;
  hasUnseen: boolean;
  onOpenStories: () => void;
  className?: string;
  showOnlineDot?: boolean;
};

/** Member count + optional «استوری جدید» — same pattern on mobile header and desktop sidebar. */
export function FamilyStoryHint({
  memberCount,
  memberLabel = 'عضو',
  hasUnseen,
  onOpenStories,
  className = 'family-topbar__subtitle',
  showOnlineDot = false,
}: FamilyStoryHintProps) {
  const hasMembers = typeof memberCount === 'number';

  if (!hasMembers && !hasUnseen) return null;

  return (
    <p className={className}>
      {hasMembers && (
        <span className="family-topbar__subtitle--live">
          {showOnlineDot && <span className="family-topbar__meta-dot" aria-hidden />}
          {memberCount.toLocaleString('fa-IR')} {memberLabel}
        </span>
      )}
      {hasUnseen && (
        <button
          type="button"
          onClick={onOpenStories}
          className="font-medium text-[var(--family-tg-pinned-accent)] transition hover:opacity-80"
        >
          {hasMembers ? ' · ' : ''}
          استوری جدید
        </button>
      )}
    </p>
  );
}
