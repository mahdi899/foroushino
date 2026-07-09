'use client';

import { useEffect, useMemo, useState } from 'react';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { cn } from '@/lib/cn';

type Props = {
  avatar?: string | null;
  avatarUrl?: string | null;
  gravatarUrl?: string | null;
  defaultAvatarUrl?: string | null;
  alt: string;
  className?: string;
};

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase();
  }

  return name.trim().slice(0, 2).toUpperCase() || '؟';
}

function buildAvatarSources({
  avatar,
  avatarUrl,
  gravatarUrl,
  defaultAvatarUrl,
}: Pick<Props, 'avatar' | 'avatarUrl' | 'gravatarUrl' | 'defaultAvatarUrl'>): string[] {
  const sources: string[] = [];

  const custom = avatarUrl?.trim() || avatar?.trim();
  if (custom) {
    sources.push(primarySiteImageSrc(custom) || custom);
  }

  const gravatar = gravatarUrl?.trim();
  if (gravatar) {
    sources.push(gravatar);
  }

  const fallback = defaultAvatarUrl?.trim();
  if (fallback) {
    sources.push(fallback);
  }

  return sources;
}

export function PanelProfileAvatar({
  avatar,
  avatarUrl,
  gravatarUrl,
  defaultAvatarUrl,
  alt,
  className,
}: Props) {
  const sources = useMemo(
    () => buildAvatarSources({ avatar, avatarUrl, gravatarUrl, defaultAvatarUrl }),
    [avatar, avatarUrl, gravatarUrl, defaultAvatarUrl],
  );

  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sources]);

  const currentSrc = sources[sourceIndex];
  const showImage = Boolean(currentSrc);
  const initials = initialsFromName(alt);

  return (
    <div className={cn('h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-soft ring-2 ring-border/80', className)}>
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentSrc}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setSourceIndex((index) => index + 1)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-primary/10 text-[11px] font-bold text-primary" aria-hidden>
          {initials}
        </div>
      )}
    </div>
  );
}
