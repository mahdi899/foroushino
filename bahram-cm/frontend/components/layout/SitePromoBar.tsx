'use client';

import Link from 'next/link';
import { SiteImage } from '@/components/ui/SiteImage';
import type { SeminarPromo } from '@/lib/services/seminarPromo';

type SitePromoBarProps = {
  promo: SeminarPromo;
};

/** Hint for Next/Image — actual height follows intrinsic aspect ratio at 100vw. */
const BANNER_WIDTH = 1920;
const BANNER_HEIGHT = 120;

export function SitePromoBar({ promo }: SitePromoBarProps) {
  const content = (
    <div className="relative w-full overflow-hidden bg-ink">
      <SiteImage
        src={promo.banner_url}
        alt={promo.banner_alt}
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        sizes="100vw"
        className="block h-auto w-full"
        wrapperClassName="block w-full"
        priority
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
