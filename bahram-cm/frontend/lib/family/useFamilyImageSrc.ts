'use client';

import { useMemo, useSyncExternalStore } from 'react';
import {
  resolveFamilyMediaPlaybackUrl,
  resolveFamilyMediaSameOriginUrl,
} from '@/lib/family/mediaPlaybackUrl';

export type FamilyImageSrcState = {
  src: string | null;
  previewSrc: string | null;
  fromCache: boolean;
  resolved: boolean;
};

const subscribeNoop = () => () => {};

/**
 * Hydration-safe feed image src: playback/CDN on server + first client paint,
 * then same-origin club `/media/family` proxy after mount so the SW can cache-first.
 * Never a `blob:` object URL — that proxy-fetch-then-blob path caused feed lag.
 */
export function useFamilyImageSrc(
  url: string | null | undefined,
  _mediaId: number,
): FamilyImageSrcState {
  const playbackUrl = useMemo(() => resolveFamilyMediaPlaybackUrl(url), [url]);

  const streamUrl = useSyncExternalStore(
    subscribeNoop,
    () => resolveFamilyMediaSameOriginUrl(url) ?? playbackUrl,
    () => playbackUrl,
  );

  return useMemo(
    () => ({
      src: streamUrl,
      previewSrc: null,
      fromCache: false,
      resolved: true,
    }),
    [streamUrl],
  );
}
