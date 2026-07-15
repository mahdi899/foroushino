'use client';

import useSWR from 'swr';
import { NowPlayingBar } from '@/components/family/NowPlayingBar';
import { PinnedMessageBar } from '@/components/family/PinnedMessageBar';
import { getPinnedPosts } from '@/lib/family/api';
import { useFamilyMediaPlayer } from '@/lib/family/FamilyMediaPlayerContext';

/** Pinned in flow; now-playing overlays feed top without shifting scroll. */
export function FamilyFeedChrome({
  showPinned = true,
  showNowPlaying = true,
  overlayNowPlaying = false,
  onScrollToPost,
}: {
  showPinned?: boolean;
  showNowPlaying?: boolean;
  overlayNowPlaying?: boolean;
  onScrollToPost?: (postId: number) => void;
}) {
  const { nowPlaying } = useFamilyMediaPlayer();
  const { data } = useSWR(showPinned ? 'family-pinned' : null, async () => (await getPinnedPosts()).data, {
    revalidateOnFocus: true,
  });

  const pinnedPosts = data ?? [];
  const showPinBar = showPinned && pinnedPosts.length > 0;
  const showNowBar = showNowPlaying && Boolean(nowPlaying);

  if (!showPinBar && !showNowBar) return null;

  return (
    <>
      {showPinBar && (
        <div className="z-30 shrink-0">
          <PinnedMessageBar pinnedPosts={pinnedPosts} onScrollToPost={onScrollToPost} />
        </div>
      )}
      {showNowBar && <NowPlayingBar overlay={overlayNowPlaying} />}
    </>
  );
}
