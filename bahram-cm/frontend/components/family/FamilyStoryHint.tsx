'use client';

type FamilyStoryHintProps = {
  memberCount?: number;
  memberLabel?: string;
  hasUnseen: boolean;
  onOpenStories: () => void;
  className?: string;
};

/** Member count + optional «استوری جدید» — same pattern on mobile header and desktop sidebar. */
export function FamilyStoryHint({
  memberCount,
  memberLabel = 'عضو',
  hasUnseen,
  onOpenStories,
  className = 'text-[11px] text-bone/50 lg:text-xs',
}: FamilyStoryHintProps) {
  const hasMembers = typeof memberCount === 'number';

  if (!hasMembers && !hasUnseen) return null;

  return (
    <p className={className}>
      {hasMembers && (
        <span>
          {memberCount.toLocaleString('fa-IR')} {memberLabel}
        </span>
      )}
      {hasUnseen && (
        <button
          type="button"
          onClick={onOpenStories}
          className="font-medium text-gold transition hover:text-gold/80"
        >
          {hasMembers ? ' · ' : ''}
          استوری جدید
        </button>
      )}
    </p>
  );
}
