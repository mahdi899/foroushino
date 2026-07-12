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
      <span className="admin-testimonial-avatar admin-testimonial-avatar--fallback">
        {name.trim().charAt(0) || '?'}
      </span>
    );
  }

  const src = normalizeAdminMediaUrl(portraitImage);

  return (
    <span className="admin-testimonial-avatar admin-testimonial-avatar--photo">
      <MediaThumb
        src={src}
        persistSrc={portraitImage}
        alt={name}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </span>
  );
}
