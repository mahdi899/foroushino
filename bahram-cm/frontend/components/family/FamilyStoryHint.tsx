'use client';

import { useEffect, useState } from 'react';
import { formatFa } from '@/lib/persian';
import { inflatedMemberCount } from '@/lib/family/inflatedMemberCount';
import { warmupUrls } from '@/lib/family/feedMediaWarmup';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';

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

  // Warm the stories list + first couple of media in the background as soon as
  // the hint mounts, so opening the viewer never shows a black flash. The
  // family API module is a server-action file, so it's imported lazily to
  // keep this component's client bundle/test footprint untouched.
  useEffect(() => {
    if (!hasUnseen) return;
    let cancelled = false;
    void import('@/lib/family/api').then(({ prefetchStories, getStories }) => {
      if (cancelled) return;
      prefetchStories();
      void getStories()
        .then((res) => {
          if (cancelled) return;
          const urls = res.data
            .slice(0, 3)
            .map((story) => {
              const media = story.media;
              if (!media) return null;
              const type = (media.type ?? '').toLowerCase();
              const mime = (media.mime_type ?? '').toLowerCase();
              if (type === 'video' || mime.startsWith('video/')) return null;
              return resolveFamilyMediaUrl(media.url);
            })
            .filter((url): url is string => Boolean(url));
          warmupUrls(urls);
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [hasUnseen]);

  const hasMembers = typeof memberCount === 'number';
  const displayReady = hasMembers && hour !== null;
  const showMemberStat = maskMemberCount || displayReady;
  const displayMemberCount =
    displayReady && !maskMemberCount ? inflatedMemberCount(memberCount, hour) : null;

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
  ) : displayMemberCount !== null ? (
    <span className="family-topbar__subtitle--live" suppressHydrationWarning>
      {showOnlineDot && <span className="family-topbar__meta-dot" aria-hidden />}
      {formatFa(displayMemberCount)} {memberLabel}
    </span>
  ) : null;

  return (
    <p className={className}>
      {showMemberStat && memberStat != null && memberStat}
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
