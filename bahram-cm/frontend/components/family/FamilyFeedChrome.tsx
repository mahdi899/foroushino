'use client';

import useSWR from 'swr';
import { NowPlayingBar } from '@/components/family/NowPlayingBar';
import { PinnedMessageBar } from '@/components/family/PinnedMessageBar';
import { getPinnedPosts } from '@/lib/family/api';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';
import type { FamilyComment } from '@/lib/family/types';

/** Pinned in flow; now-playing overlays feed top without shifting scroll. */
export function FamilyFeedChrome({
  showPinned = true,
  showNowPlaying = true,
  overlayNowPlaying = false,
  onOpenComments,
}: {
  showPinned?: boolean;
  showNowPlaying?: boolean;
  overlayNowPlaying?: boolean;
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
    <>
      {showPinBar && (
        <div className="z-30 shrink-0">
          <PinnedMessageBar onOpenComments={onOpenComments} />
        </div>
      )}
      {showNowBar && <NowPlayingBar overlay={overlayNowPlaying} />}
    </>
  );
}
