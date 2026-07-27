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
 * CDN-first, synchronous: the feed <img> src is always the CDN stream URL —
 * never a `blob:` object URL built from a client-side Cache API round trip.
 * That proxy-fetch-then-blob path is what caused visible feed lag (extra
 * network hop through the club host + decode of a full-size fetch response
 * before the pixel could show). The browser's own HTTP cache on the CDN
 * origin now does the "already loaded → instant" job a messenger needs.
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
