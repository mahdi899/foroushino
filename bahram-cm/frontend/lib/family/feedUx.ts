/**
 * Family feed UX tuning — balance smooth scroll vs API/CDN/memory pressure.
 * Telegram-like: prefetch just ahead of the finger, not the whole history.
 * Tuned for mid/low-end phones without dropping core feed behavior.
 */

/** Virtual rows mounted outside viewport (DOM cost vs scroll smoothness). */
export const FAMILY_FEED_VIRTUAL_OVERSCAN = 6;

/** @deprecated Use {@link familyFeedTopSentinelRootMargin} — IO only accepts px/% not CSS min(). */
export const FAMILY_FEED_TOP_SENTINEL_ROOT_MARGIN = '900px 0px 0px 0px';

/** Load older JSON when the top sentinel is still a bit below the fold. */
export function familyFeedTopSentinelRootMargin(viewportHeightPx: number): string {
  const top = Math.round(Math.min(Math.max(viewportHeightPx, 0) * 0.6, 900));
  return `${top}px 0px 0px 0px`;
}

/** @deprecated Use {@link familyFeedMediaRootMargin} */
export const FAMILY_FEED_MEDIA_ROOT_MARGIN = '720px 0px 480px 0px';

/** In-feed media: start decode well before visible so fast scroll never shows an empty box. */
export function familyFeedMediaRootMargin(viewportHeightPx: number): string {
  const h = Math.max(viewportHeightPx, 0);
  const top = Math.round(Math.min(h * 1.2, 1600));
  const bottom = Math.round(Math.min(h * 0.6, 900));
  return `${top}px 0px ${bottom}px 0px`;
}

/** Extra history fetch when user scrolls up and is this close to loaded top (px). */
export const FAMILY_FEED_HISTORY_PREFETCH_SCROLL_PX = 1200;

/** Min ms between proactive history fetches (sentinel may still fire once). */
export const FAMILY_FEED_HISTORY_PREFETCH_COOLDOWN_MS = 4_000;

/**
 * Window around scroll anchor for image/poster warmup — wide enough that a fast
 * fling always has ~10 posts of media already warm ahead of the visible viewport
 * (Telegram-like: media is ready before the message scrolls in, never after).
 */
export const FAMILY_FEED_MEDIA_WARM_POSTS_BEFORE = 7;
export const FAMILY_FEED_MEDIA_WARM_POSTS_AFTER = 3;

/** Max parallel CDN image warmups (HTTP cache); keep low on mobile networks. */
export const FAMILY_FEED_MEDIA_WARM_MAX_CONCURRENT = 6;

/**
 * Posts at feed tip to warm once after boot (visible conversation).
 * Telegram-like: always keep ~7-10 posts decoded and ready in the background
 * so a normal scroll never outruns what's already warm — the scroll-anchored
 * window (before/after above) keeps extending this as the user scrolls,
 * rather than warming the whole history up front.
 */
export const FAMILY_FEED_INITIAL_WARM_POST_COUNT = 10;
