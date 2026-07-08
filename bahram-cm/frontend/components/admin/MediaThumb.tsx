'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminMediaThumbFallbacks, normalizeAdminMediaUrl } from '@/lib/mediaUrl';

interface MediaThumbProps {
  src: string;
  persistSrc: string;
  legacyPath?: string | null;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: React.ReactEventHandler<HTMLImageElement>;
}

/** Admin gallery thumbnail with light backdrop + URL fallbacks for legacy imports. */
export function MediaThumb({ src, persistSrc, legacyPath, alt, className, style, onLoad }: MediaThumbProps) {
  const fallbacks = useMemo(
    () => adminMediaThumbFallbacks({ src, persistSrc, legacyPath }),
    [src, persistSrc, legacyPath],
  );
  const [index, setIndex] = useState(0);
  const currentSrc = normalizeAdminMediaUrl(fallbacks[index] ?? src);

  useEffect(() => {
    setIndex(0);
  }, [fallbacks.join('|')]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      style={style}
      onLoad={onLoad}
      onError={() => {
        setIndex((prev) => (prev + 1 < fallbacks.length ? prev + 1 : prev));
      }}
    />
  );
}
