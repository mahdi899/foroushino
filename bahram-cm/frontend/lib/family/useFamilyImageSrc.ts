'use client';

import { useMemo } from 'react';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';

export type FamilyImageSrcState = {
  src: string | null;
  previewSrc: string | null;
  fromCache: boolean;
  resolved: boolean;
};

/**
 * CDN-first fallback, same-origin on family host: the feed <img> src prefers the
 * club `/media/family` proxy so the service worker can cache-first images.
 * Never a `blob:` object URL — that proxy-fetch-then-blob path caused feed lag.
 */
export function useFamilyImageSrc(
  url: string | null | undefined,
  _mediaId: number,
): FamilyImageSrcState {
  const streamUrl = useMemo(() => resolveFamilyMediaUrl(url), [url]);

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
