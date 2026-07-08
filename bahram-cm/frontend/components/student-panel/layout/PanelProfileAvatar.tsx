'use client';

import { useEffect, useState } from 'react';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';

type Props = {
  avatar?: string | null;
  seed: string;
  alt: string;
};

function AvatarPlaceholder() {
  return <div className="h-full w-full bg-primary/10" aria-hidden />;
}

export function PanelProfileAvatar({ avatar, seed, alt }: Props) {
  const avatarSrc = avatar?.trim();
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

  useEffect(() => {
    if (avatarSrc) return;
    setFallbackSrc(`https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(seed || 'student')}`);
  }, [avatarSrc, seed]);

  return (
    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-surface-soft ring-2 ring-border/80">
      {avatarSrc ? (
        <DirectMediaImg admin src={avatarSrc} alt={alt} className="h-full w-full object-cover" />
      ) : fallbackSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fallbackSrc} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <AvatarPlaceholder />
      )}
    </div>
  );
}
