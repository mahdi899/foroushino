'use client';

import { sitePhotos } from '@/lib/site-photo-paths';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { useDataTheme } from '@/lib/useDataTheme';

/**
 * Fixed photo wallpaper behind the family message list.
 * Light/dark pattern assets swap with the site theme.
 */
export function FamilyFeedWallpaper() {
  const theme = useDataTheme();
  const raw =
    theme === 'light' ? sitePhotos.familyChatWallpaperLight : sitePhotos.familyChatWallpaperDark;
  const src = primarySiteImageSrc(raw) || raw;

  return (
    <div className="family-feed-wallpaper" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative wallpaper; avoid next/image layout cost in feed chrome */}
      <img
        key={src}
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
