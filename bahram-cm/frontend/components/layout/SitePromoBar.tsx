'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SiteImage } from '@/components/ui/SiteImage';
import type { SeminarPromo } from '@/lib/services/seminarPromo';

type SitePromoBarProps = {
  promo: SeminarPromo;
};

const DEFAULT_ASPECT_RATIO = 1920 / 120;

export function SitePromoBar({ promo }: SitePromoBarProps) {
  const [aspectRatio, setAspectRatio] = useState(DEFAULT_ASPECT_RATIO);

  const content = (
    <div
      className="relative w-full overflow-hidden bg-ink"
      style={{ aspectRatio }}
    >
      <SiteImage
        src={promo.banner_url}
        alt={promo.banner_alt}
        fill
        sizes="100vw"
        className="object-contain object-center"
        priority
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            setAspectRatio(naturalWidth / naturalHeight);
          }
        }}
      />
    </div>
  );

  if (promo.link) {
    return (
      <Link
        href={promo.link}
        className="relative z-[3] block w-full transition-opacity hover:opacity-95"
        aria-label={`${promo.title} — مشاهده سمینار`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="relative z-[3] w-full" aria-label={promo.title}>
      {content}
    </div>
  );
}
