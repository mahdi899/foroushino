import { HeroLcpImage } from '@/components/sections/HeroLcpImage';
import { IMAGE_SIZES } from '@/lib/imageSizes';
import { sitePhotos } from '@/lib/site-photo-paths';

/** Desktop hero intrinsic dimensions (hero-background.webp). */
const DESKTOP_INTRINSIC = { width: 1920, height: 1080 } as const;
/** Mobile hero intrinsic dimensions (hero-background-mobile.webp). */
const MOBILE_INTRINSIC = { width: 941, height: 941 } as const;

/**
 * Server-rendered hero backgrounds — paint in the initial HTML without waiting
 * for the HeroCinematic client bundle (framer-motion).
 */
export function HeroCinematicMedia() {
  return (
    <>
      <div className="hero-light-media hero-light-media--mobile md:hidden" aria-hidden>
        <div className="hero-light-media-motion hero-light-media-motion--lcp">
          <HeroLcpImage
            src={sitePhotos.heroBackgroundMobile}
            width={MOBILE_INTRINSIC.width}
            height={MOBILE_INTRINSIC.height}
            sizes={IMAGE_SIZES.heroLcpMobile}
            className="hero-light-grid-img hero-light-grid-img--mobile"
          />
        </div>
        <div className="hero-light-grid-scrim hero-light-grid-scrim--static" />
        <div className="hero-light-image-fade" aria-hidden />
      </div>

      <div className="hero-light-media hero-light-media--desktop hidden md:block" aria-hidden>
        <div className="hero-light-media-motion hero-light-media-motion--lcp">
          <HeroLcpImage
            src={sitePhotos.heroBackground}
            width={DESKTOP_INTRINSIC.width}
            height={DESKTOP_INTRINSIC.height}
            sizes={IMAGE_SIZES.heroLcpDesktop}
            className="hero-light-grid-img hero-light-grid-img--desktop"
          />
        </div>
        <div className="hero-light-grid-scrim hero-light-grid-scrim--static" />
        <div className="hero-light-image-fade" aria-hidden />
      </div>
    </>
  );
}
