'use client';

import { MediaThumb } from '@/components/admin/MediaThumb';
import { normalizeAdminMediaUrl } from '@/lib/mediaUrl';

export function MiniCourseRowThumb({
  title,
  image,
}: {
  title: string;
  image: string;
}) {
  const src = normalizeAdminMediaUrl(image);

  return (
    <span className="relative block h-11 w-[4.75rem] shrink-0 overflow-hidden rounded-md ring-1 ring-border">
      <MediaThumb
        src={src}
        persistSrc={image}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </span>
  );
}
