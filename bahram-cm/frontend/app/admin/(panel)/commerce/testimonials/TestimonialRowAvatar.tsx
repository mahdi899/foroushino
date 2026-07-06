'use client';

import { MediaThumb } from '@/components/admin/MediaThumb';
import { normalizeAdminMediaUrl } from '@/lib/mediaUrl';

export function TestimonialRowAvatar({
  name,
  portraitImage,
}: {
  name: string;
  portraitImage: string | null;
}) {
  if (!portraitImage) {
    return (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-soft text-caption font-bold text-primary">
        {name.trim().charAt(0) || '?'}
      </span>
    );
  }

  const src = normalizeAdminMediaUrl(portraitImage);

  return (
    <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-border">
      <MediaThumb
        src={src}
        persistSrc={portraitImage}
        alt={name}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </span>
  );
}
