'use client';

import { useEffect, useState } from 'react';
import { AppImage, type AppImageProps } from '@/components/ui/AppImage';
import { coalesceAlt } from '@/lib/media/altShared';
import { persistMediaUrl } from '@/lib/mediaUrl';

export type SiteImageProps = Omit<AppImageProps, 'alt'> & {
  alt?: string | null;
  /** Used when `alt` is empty — e.g. article title or frame label. */
  fallbackAlt?: string;
};

/**
 * Public-site image with guaranteed alt text and scroll-based lazy loading via AppImage.
 * Fetches admin-controlled alt from `/api/media/alt` when not provided explicitly.
 */
export function SiteImage({ alt, fallbackAlt, src, ...props }: SiteImageProps) {
  const initialAlt = coalesceAlt(
    typeof alt === 'string' ? alt : undefined,
    fallbackAlt,
    typeof src === 'string' ? src : undefined,
  );
  const [resolvedAlt, setResolvedAlt] = useState(initialAlt);

  useEffect(() => {
    setResolvedAlt(initialAlt);
  }, [initialAlt]);

  useEffect(() => {
    if (typeof alt === 'string' && alt.trim()) return;
    if (typeof src !== 'string' || !src.trim()) return;

    const ref = persistMediaUrl(src);
    let cancelled = false;

    fetch(`/api/media/alt?ref=${encodeURIComponent(ref)}`, {
      headers: { Accept: 'application/json' },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { data?: { alt_fa?: string | null } } | null) => {
        if (cancelled || !json?.data?.alt_fa?.trim()) return;
        setResolvedAlt(json.data.alt_fa.trim());
      })
      .catch(() => {
        /* keep fallback */
      });

    return () => {
      cancelled = true;
    };
  }, [alt, src]);

  return <AppImage {...props} src={src} alt={resolvedAlt} />;
}
