'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getCachedFamilyMediaObjectUrl,
  getFamilyMediaBlobUrl,
  readFamilyMediaBlob,
} from '@/lib/family/mediaCache';
import { enqueueFamilyMediaLoad } from '@/lib/family/mediaLoadQueue';
import { tryBuildImagePreviewBlob } from '@/lib/family/mediaPreview';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';

export type FamilyImageSrcState = {
  src: string | null;
  previewSrc: string | null;
  fromCache: boolean;
  resolved: boolean;
};

/** Prefer a warm local blob; fall back to CDN stream URL after a quick cache check. */
export function useFamilyImageSrc(
  url: string | null | undefined,
  mediaId: number,
): FamilyImageSrcState {
  const streamUrl = useMemo(() => resolveFamilyMediaUrl(url), [url]);
  const [state, setState] = useState<FamilyImageSrcState>({
    src: null,
    previewSrc: null,
    fromCache: false,
    resolved: !streamUrl,
  });

  useEffect(() => {
    if (!streamUrl) {
      setState({ src: null, previewSrc: null, fromCache: false, resolved: true });
      return;
    }

    let cancelled = false;

    void (async () => {
      const cached = await getCachedFamilyMediaObjectUrl(streamUrl, mediaId);
      if (cancelled) return;

      if (cached) {
        setState({ src: cached, previewSrc: null, fromCache: true, resolved: true });
        return;
      }

      const previewBlob = await readFamilyMediaBlob('preview', mediaId, streamUrl);
      if (cancelled) return;

      const previewSrc = previewBlob
        ? getFamilyMediaBlobUrl(`preview:${mediaId}:${streamUrl}`, previewBlob)
        : null;

      setState({
        src: streamUrl,
        previewSrc,
        fromCache: false,
        resolved: true,
      });

      void enqueueFamilyMediaLoad('preview', mediaId, () =>
        tryBuildImagePreviewBlob(mediaId, streamUrl),
      ).then((blob) => {
        if (cancelled || !blob) return;
        const built = getFamilyMediaBlobUrl(`preview:${mediaId}:${streamUrl}`, blob);
        setState((prev) =>
          prev.src === streamUrl && !prev.fromCache ? { ...prev, previewSrc: built } : prev,
        );
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [mediaId, streamUrl]);

  return state;
}
