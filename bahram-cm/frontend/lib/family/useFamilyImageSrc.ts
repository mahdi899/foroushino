'use client';

import { useEffect, useMemo, useState } from 'react';
import { getCachedFamilyMediaObjectUrl } from '@/lib/family/mediaCache';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';

/** Prefer a warm local blob for images; fall back to CDN stream URL immediately. */
export function useFamilyImageSrc(url: string | null | undefined, mediaId: number): string | null {
  const streamUrl = useMemo(() => resolveFamilyMediaUrl(url), [url]);
  const [src, setSrc] = useState<string | null>(streamUrl);

  useEffect(() => {
    if (!streamUrl) {
      setSrc(null);
      return;
    }

    setSrc(streamUrl);
    let cancelled = false;

    void getCachedFamilyMediaObjectUrl(streamUrl, mediaId).then((cached) => {
      if (!cancelled && cached) setSrc(cached);
    });

    // Images stream from CDN — no Cache API prefetch (see rememberFamilyMediaView).

    return () => {
      cancelled = true;
    };
  }, [mediaId, streamUrl]);

  return src;
}
