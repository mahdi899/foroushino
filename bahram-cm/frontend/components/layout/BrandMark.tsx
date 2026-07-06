'use client';

import { AppImage } from '@/components/ui/AppImage';
import { sitePhotos } from '@/lib/site-photo-paths';
import { cn } from '@/lib/utils';

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-border',
        className,
      )}
      aria-hidden
    >
      <AppImage
        src={sitePhotos.portraitFounder}
        alt=""
        fill
        sizes="(max-width: 768px) 48px, 40px"
        className="object-cover object-[center_20%]"
        priority
      />
    </div>
  );
}
