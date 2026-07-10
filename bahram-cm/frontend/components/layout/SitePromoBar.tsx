'use client';

import Link from 'next/link';
import { SiteImage } from '@/components/ui/SiteImage';
import type { SeminarPromo } from '@/lib/services/seminarPromo';

type SitePromoBarProps = {
  promo: SeminarPromo;
};

/** Desktop wide strip — actual height follows intrinsic aspect ratio at 100vw. */
const DESKTOP_BANNER = { width: 1920, height: 120 } as const;
/** Mobile promo — taller strip for narrow screens. */
const MOBILE_BANNER = { width: 750, height: 200 } as const;

function PromoBannerImage({
  src,
  alt,
  width,
  height,
  wrapperClassName,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  wrapperClassName?: string;
}) {
  return (
    <SiteImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes="100vw"
      className="block h-auto w-full"
      wrapperClassName={wrapperClassName ?? 'block w-full'}
      priority
    />
  );
}

export function SitePromoBar({ promo }: SitePromoBarProps) {
  const mobileSrc = promo.banner_url_mobile || promo.banner_url;

  const content = (
    <div className="relative w-full overflow-hidden bg-ink">
      <PromoBannerImage
        src={mobileSrc}
        alt={promo.banner_alt}
        width={MOBILE_BANNER.width}
        height={MOBILE_BANNER.height}
        wrapperClassName="block w-full md:hidden"
      />
      <PromoBannerImage
        src={promo.banner_url}
        alt={promo.banner_alt}
        width={DESKTOP_BANNER.width}
        height={DESKTOP_BANNER.height}
        wrapperClassName="hidden w-full md:block"
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
