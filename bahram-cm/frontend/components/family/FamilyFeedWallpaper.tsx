import { sitePhotos } from '@/lib/site-photo-paths';
import { primarySiteImageSrc } from '@/lib/mediaUrl';

/**
 * Fixed photo wallpaper behind the family message list.
 * Uses a real <img> (not CSS ::before + filter) so mobile Safari paints it reliably.
 */
export function FamilyFeedWallpaper() {
  const src = primarySiteImageSrc(sitePhotos.familyChatWallpaper) || sitePhotos.familyChatWallpaper;

  return (
    <div className="family-feed-wallpaper" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative wallpaper; avoid next/image layout cost in feed chrome */}
      <img
        className="family-feed-wallpaper__img"
        src={src}
        alt=""
        decoding="async"
        fetchPriority="low"
        draggable={false}
      />
      <div className="family-feed-wallpaper__veil" />
    </div>
  );
}
