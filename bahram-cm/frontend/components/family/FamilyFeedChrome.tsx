'use client';

import useSWR from 'swr';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NowPlayingBar } from '@/components/family/NowPlayingBar';
import { PinnedMessageBar } from '@/components/family/PinnedMessageBar';
import { PinnedBarSkeleton } from '@/components/family/PinnedBarSkeleton';
import { getPinnedPosts } from '@/lib/family/api';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { familyPinnedSwr } from '@/lib/family/swr';

type ChromePart = 'pinned' | 'now' | 'all';

/** Pinned + now-playing chrome above the feed (glass, Telegram-style). */
export function FamilyFeedChrome({
  showPinned = true,
  showNowPlaying = true,
  parts = 'all',
  onScrollToPost,
}: {
  showPinned?: boolean;
  showNowPlaying?: boolean;
  parts?: ChromePart;
  onScrollToPost?: (postId: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const { nowPlaying } = useFamilyMediaPlayer();
  const wantsPinned = parts === 'pinned' || parts === 'all';
  const wantsNow = parts === 'now' || parts === 'all';

  const { data } = useSWR(
    showPinned && wantsPinned ? 'family-pinned' : null,
    async () => (await getPinnedPosts()).data,
    {
      revalidateOnFocus: familyPinnedSwr.revalidateOnFocus,
      dedupingInterval: familyPinnedSwr.dedupingInterval,
      revalidateIfStale: familyPinnedSwr.revalidateIfStale,
    },
  );

  const pinnedResolved = data !== undefined;
  const pinnedPosts = data ?? [];
  const showPinSlot = Boolean(showPinned && wantsPinned && (!pinnedResolved || pinnedPosts.length > 0));
  const showNowBar = showNowPlaying && wantsNow && Boolean(nowPlaying);

  if (!showPinSlot && !showNowBar) return null;

  const nowFade = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18, ease: 'easeOut' },
      };

  return (
    <>
      {/* Stable pin slot — no AnimatePresence remount (avoids chromeInset / feed jump). */}
      {showPinSlot ? (
        <div className="family-feed-chrome-item family-feed-chrome-item--pinned family-feed-chrome-item--pinned-slot z-30 shrink-0">
          {!pinnedResolved ? (
            <PinnedBarSkeleton />
          ) : (
            <PinnedMessageBar pinnedPosts={pinnedPosts} onScrollToPost={onScrollToPost} />
          )}
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {showNowBar ? (
          <motion.div
            key="family-now-playing-chrome"
            className="family-feed-chrome-item family-feed-chrome-item--now z-40 shrink-0 overflow-hidden"
            {...nowFade}
          >
            <NowPlayingBar />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
