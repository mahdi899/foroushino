'use client';

import { useMemo, useState } from 'react';
import { adminMediaThumbFallbacks } from '@/lib/mediaUrl';

interface MediaThumbProps {
  src: string;
  persistSrc: string;
  legacyPath?: string | null;
  alt: string;
  className?: string;
}

/** Admin gallery thumbnail with light backdrop + URL fallbacks for legacy imports. */
export function MediaThumb({ src, persistSrc, legacyPath, alt, className }: MediaThumbProps) {
  const fallbacks = useMemo(
    () => adminMediaThumbFallbacks({ src, persistSrc, legacyPath }),
    [src, persistSrc, legacyPath],
  );
  const [index, setIndex] = useState(0);
  const currentSrc = fallbacks[index] ?? src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        setIndex((prev) => (prev + 1 < fallbacks.length ? prev + 1 : prev));
      }}
    />
  );
}
