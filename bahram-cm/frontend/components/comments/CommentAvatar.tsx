'use client';

import { useEffect, useMemo, useState } from 'react';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { cn } from '@/lib/cn';

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '؟';
}

export function CommentAvatar({
  name,
  avatarUrl,
  className,
  size = 'md',
}: {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const sources = useMemo(() => {
    const src = avatarUrl?.trim();
    return src ? [primarySiteImageSrc(src) || src] : [];
  }, [avatarUrl]);

  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const currentSrc = sources[sourceIndex];

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'border border-gold/25 bg-charcoal/80 text-xs font-bold text-gold-soft',
        size === 'sm' ? 'h-9 w-9' : 'h-10 w-10 sm:h-11 sm:w-11',
        className,
      )}
      aria-hidden
    >
      {currentSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setSourceIndex((index) => index + 1)}
        />
      ) : (
        initialsFromName(name)
      )}
    </div>
  );
}
