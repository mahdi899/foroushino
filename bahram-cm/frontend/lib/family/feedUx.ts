/**
 * Family feed UX tuning — balance smooth scroll vs API/CDN/memory pressure.
 * Telegram-like: prefetch just ahead of the finger, not the whole history.
 * Tuned for mid/low-end phones without dropping core feed behavior.
 */

/** Virtual rows mounted outside viewport (DOM cost vs scroll smoothness). */
export const FAMILY_FEED_VIRTUAL_OVERSCAN = 6;

/** @deprecated Use {@link familyFeedTopSentinelRootMargin} — IO only accepts px/% not CSS min(). */
export const FAMILY_FEED_TOP_SENTINEL_ROOT_MARGIN = '560px 0px 0px 0px';

/** Load older JSON when the top sentinel is still a bit below the fold. */
export function familyFeedTopSentinelRootMargin(viewportHeightPx: number): string {
  const top = Math.round(Math.min(Math.max(viewportHeightPx, 0) * 0.4, 560));
  return `${top}px 0px 0px 0px`;
}

/** @deprecated Use {@link familyFeedMediaRootMargin} */
export const FAMILY_FEED_MEDIA_ROOT_MARGIN = '480px 0px 280px 0px';

/** In-feed media: start decode shortly before visible — wide margins cause decode storms. */
export function familyFeedMediaRootMargin(viewportHeightPx: number): string {
  const h = Math.max(viewportHeightPx, 0);
  const top = Math.round(Math.min(h * 0.55, 720));
  const bottom = Math.round(Math.min(h * 0.3, 420));
  return `${top}px 0px ${bottom}px 0px`;
}

/** Extra history fetch when user scrolls up and is this close to loaded top (px). */
export const FAMILY_FEED_HISTORY_PREFETCH_SCROLL_PX = 720;

/** Min ms between proactive history fetches (sentinel may still fire once). */
export const FAMILY_FEED_HISTORY_PREFETCH_COOLDOWN_MS = 4_000;

/**
 * Window around scroll anchor for image/poster warmup.
 * Keep tight: CDN + decode on mobile is the main fling hitch source.
 */
export const FAMILY_FEED_MEDIA_WARM_POSTS_BEFORE = 4;
export const FAMILY_FEED_MEDIA_WARM_POSTS_AFTER = 2;

/** Max parallel CDN image warmups (HTTP cache); keep low on mobile networks. */
export const FAMILY_FEED_MEDIA_WARM_MAX_CONCURRENT = 3;

/**
 * Posts at feed tip to warm once after boot (visible conversation).
 */
export const FAMILY_FEED_INITIAL_WARM_POST_COUNT = 6;
