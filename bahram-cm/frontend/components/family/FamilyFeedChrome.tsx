'use client';

import useSWR from 'swr';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { NowPlayingBar } from '@/components/family/NowPlayingBar';
import { PinnedMessageBar } from '@/components/family/PinnedMessageBar';
import { getPinnedPosts } from '@/lib/family/api';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import { familyMotion } from '@/lib/family/motion';

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
    { revalidateOnFocus: true },
  );

  const pinnedPosts = data ?? [];
  const showPinBar = showPinned && wantsPinned && pinnedPosts.length > 0;
  const showNowBar = showNowPlaying && wantsNow && Boolean(nowPlaying);

  if (!showPinBar && !showNowBar) return null;

  const pinnedMotion = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -10, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -6, scale: 0.99 },
        transition: familyMotion.tween,
      };

  const nowMotion = reduceMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -14, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -10, scale: 0.985 },
        transition: familyMotion.spring,
      };

  return (
    <>
      <AnimatePresence initial={false}>
        {showPinBar ? (
          <motion.div
            key="family-pinned-chrome"
            className="family-feed-chrome-item family-feed-chrome-item--pinned z-30 shrink-0 overflow-hidden"
            {...pinnedMotion}
          >
            <PinnedMessageBar pinnedPosts={pinnedPosts} onScrollToPost={onScrollToPost} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {showNowBar ? (
          <motion.div
            key="family-now-playing-chrome"
            className="family-feed-chrome-item family-feed-chrome-item--now z-40 shrink-0 overflow-hidden"
            {...nowMotion}
          >
            <NowPlayingBar />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
