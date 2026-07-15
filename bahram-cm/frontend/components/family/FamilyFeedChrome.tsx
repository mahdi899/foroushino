'use client';

import useSWR from 'swr';
import { NowPlayingBar } from '@/components/family/NowPlayingBar';
import { PinnedMessageBar } from '@/components/family/PinnedMessageBar';
import { getPinnedPosts } from '@/lib/family/api';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import type { FamilyComment } from '@/lib/family/types';

/** Pinned message slot + Telegram-style now playing bar beneath it (or in pin slot). */
export function FamilyFeedChrome({
  showPinned = true,
  showNowPlaying = true,
  onOpenComments,
}: {
  showPinned?: boolean;
  showNowPlaying?: boolean;
  onOpenComments?: (handlers: {
    postId: number;
    onCommentAdded: (comment: FamilyComment) => void;
  }) => void;
}) {
  const { nowPlaying } = useFamilyMediaPlayer();
  const { data } = useSWR(showPinned ? 'family-pinned' : null, async () => (await getPinnedPosts()).data, {
    revalidateOnFocus: true,
  });

  const pinned = data?.[0];
  const showPinBar = showPinned && Boolean(pinned);
  const showNowBar = showNowPlaying && Boolean(nowPlaying);

  if (!showPinBar && !showNowBar) return null;

  return (
    <div className="z-30 shrink-0">
      {showPinBar && <PinnedMessageBar onOpenComments={onOpenComments} />}
      {showNowBar && <NowPlayingBar />}
    </div>
  );
}
