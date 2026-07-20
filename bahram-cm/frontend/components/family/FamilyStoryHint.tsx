'use client';

import { useEffect, useState } from 'react';
import { formatFa } from '@/lib/persian';
import { inflatedMemberCount } from '@/lib/family/inflatedMemberCount';

type FamilyStoryHintProps = {
  memberCount?: number;
  memberLabel?: string;
  hasUnseen: boolean;
  onOpenStories: () => void;
  className?: string;
  showOnlineDot?: boolean;
  /** Hide real member count for guests — blurred placeholder only. */
  maskMemberCount?: boolean;
  onMaskedMemberCountClick?: () => void;
  /** When parent is already a button/link, render CTA as text (no nested button). */
  nested?: boolean;
};

/** Member count + optional «استوری جدید» — same pattern on mobile header and desktop sidebar. */
export function FamilyStoryHint({
  memberCount,
  memberLabel = 'عضو',
  hasUnseen,
  onOpenStories,
  className = 'family-topbar__subtitle',
  showOnlineDot = false,
  maskMemberCount = false,
  onMaskedMemberCountClick,
  nested = false,
}: FamilyStoryHintProps) {
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    const syncHour = () => setHour(new Date().getHours());
    syncHour();
    const id = window.setInterval(syncHour, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const hasMembers = typeof memberCount === 'number';
  const showMemberStat = maskMemberCount || hasMembers;
  const displayMemberCount =
    hasMembers && !maskMemberCount && hour !== null
      ? inflatedMemberCount(memberCount, hour)
      : null;

  if (!showMemberStat && !hasUnseen) return null;

  const unseenLabel = (
    <span className="font-medium text-[var(--family-tg-pinned-accent)]">
      {showMemberStat ? ' · ' : ''}
      استوری جدید
    </span>
  );

  const memberStat = maskMemberCount ? (
    nested ? (
      <span
        className="family-guest-stat-mask family-topbar__subtitle--live"
        aria-label="تعداد اعضا پنهان است"
      >
        <span className="family-guest-stat-mask__value" aria-hidden>
          ۰۰ {memberLabel}
        </span>
      </span>
    ) : (
      <button
        type="button"
        onClick={onMaskedMemberCountClick}
        className="family-guest-stat-mask family-topbar__subtitle--live"
        aria-label="برای دیدن تعداد اعضا عضو خانواده شو"
      >
        <span className="family-guest-stat-mask__value" aria-hidden>
          ۰۰ {memberLabel}
        </span>
      </button>
    )
  ) : (
    <span className="family-topbar__subtitle--live" suppressHydrationWarning>
      {showOnlineDot && <span className="family-topbar__meta-dot" aria-hidden />}
      {formatFa(displayMemberCount ?? memberCount ?? 0)} {memberLabel}
    </span>
  );

  return (
    <p className={className}>
      {showMemberStat && memberStat}
      {hasUnseen &&
        (nested ? (
          unseenLabel
        ) : (
          <button
            type="button"
            onClick={onOpenStories}
            className="font-medium text-[var(--family-tg-pinned-accent)] transition hover:opacity-80"
          >
            {showMemberStat ? ' · ' : ''}
            استوری جدید
          </button>
        ))}
    </p>
  );
}
