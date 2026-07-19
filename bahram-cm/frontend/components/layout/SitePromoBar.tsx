'use client';

import Link from 'next/link';
import { SiteImage } from '@/components/ui/SiteImage';
import type { SeminarPromo } from '@/lib/services/seminarPromo';

type SitePromoBarProps = {
  promo: SeminarPromo;
};

/** Fallback desktop strip ratio (1983×83). */
const DESKTOP_BANNER_FALLBACK = { width: 1983, height: 83 } as const;
/** Fallback mobile strip ratio (1632×235). */
const MOBILE_BANNER_FALLBACK = { width: 1632, height: 235 } as const;

function resolveBannerSize(
  promo: SeminarPromo,
  variant: 'desktop' | 'mobile',
): { width: number; height: number } {
  if (variant === 'mobile') {
    return {
      width: promo.banner_mobile_width ?? MOBILE_BANNER_FALLBACK.width,
      height: promo.banner_mobile_height ?? MOBILE_BANNER_FALLBACK.height,
    };
  }

  return {
    width: promo.banner_width ?? DESKTOP_BANNER_FALLBACK.width,
    height: promo.banner_height ?? DESKTOP_BANNER_FALLBACK.height,
  };
}

function PromoBannerImage({
  src,
  alt,
  width,
  height,
  wrapperClassName,
  sizes = '100vw',
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  wrapperClassName?: string;
  sizes?: string;
}) {
  return (
    <div className={wrapperClassName ?? 'site-promo-bar__frame block w-full'}>
      <SiteImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes={sizes}
        priority
        className="site-promo-bar__img h-auto w-full"
      />
    </div>
  );
}

export function SitePromoBar({ promo }: SitePromoBarProps) {
  const desktopSrc = promo.banner_url;
  const mobileSrc = promo.banner_url_mobile?.trim() || '';
  const hasDedicatedMobile = mobileSrc !== '' && mobileSrc !== desktopSrc;
  const desktopSize = resolveBannerSize(promo, 'desktop');
  const mobileSize = resolveBannerSize(promo, 'mobile');

  const content = (
    <div className="site-promo-bar relative w-full overflow-hidden bg-ink">
      {hasDedicatedMobile ? (
        <PromoBannerImage
          src={mobileSrc}
          alt={promo.banner_alt}
          width={mobileSize.width}
          height={mobileSize.height}
          wrapperClassName="site-promo-bar__frame site-promo-bar__frame--mobile block w-full md:hidden"
          sizes="100vw"
        />
      ) : null}
      <PromoBannerImage
        src={desktopSrc}
        alt={promo.banner_alt}
        width={desktopSize.width}
        height={desktopSize.height}
        wrapperClassName={
          hasDedicatedMobile
            ? 'site-promo-bar__frame site-promo-bar__frame--desktop hidden w-full md:block'
            : 'site-promo-bar__frame site-promo-bar__frame--desktop block w-full'
        }
        sizes="100vw"
      />
    </div>
  );

  if (promo.link) {
    return (
      <Link
        href={promo.link}
        className="site-promo-bar-link relative z-[3] block w-full"
        aria-label={`${promo.title} — مشاهده سمینار`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="site-promo-bar-link relative z-[3] w-full" aria-label={promo.title}>
      {content}
    </div>
  );
}
