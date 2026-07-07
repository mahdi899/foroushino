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
export function SiteImage({ alt, fallbackAlt, src, priority, ...props }: SiteImageProps) {
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
    if (priority) return;
    if (typeof alt === 'string' && alt.trim()) return;
    if (typeof src !== 'string' || !src.trim()) return;

    const ref = persistMediaUrl(src);
    let cancelled = false;

    const loadAlt = () => {
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
    };

    if (typeof window.requestIdleCallback === 'function') {
      const idleId = window.requestIdleCallback(loadAlt, { timeout: 3000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idleId);
      };
    }

    const timerId = window.setTimeout(loadAlt, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [alt, priority, src]);

  return <AppImage {...props} priority={priority} src={src} alt={resolvedAlt} />;
}
