/**
 * Family feed UX tuning — balance smooth scroll vs API/CDN/memory pressure.
 * Telegram-like: prefetch just ahead of the finger, not the whole history.
 */

/** Virtual rows mounted outside viewport (DOM cost vs scroll smoothness). */
export const FAMILY_FEED_VIRTUAL_OVERSCAN = 16;

/** Load older JSON when the top sentinel is still ~4–5 posts below the fold. */
export const FAMILY_FEED_TOP_SENTINEL_ROOT_MARGIN = 'min(100vh, 2000px) 0px 0px 0px';

/** In-feed media: start decode before visible, without pulling entire history. */
export const FAMILY_FEED_MEDIA_ROOT_MARGIN = 'min(90vh, 1600px) 0px min(50vh, 900px) 0px';

/** Extra history fetch when user scrolls up and is this close to loaded top (px). */
export const FAMILY_FEED_HISTORY_PREFETCH_SCROLL_PX = 2000;

/** Min ms between proactive history fetches (sentinel may still fire once). */
export const FAMILY_FEED_HISTORY_PREFETCH_COOLDOWN_MS = 4_000;

/** Window around scroll anchor for image/poster warmup. */
export const FAMILY_FEED_MEDIA_WARM_POSTS_BEFORE = 5;
export const FAMILY_FEED_MEDIA_WARM_POSTS_AFTER = 3;

/** Max parallel CDN image warmups (HTTP cache); keep low on mobile networks. */
export const FAMILY_FEED_MEDIA_WARM_MAX_CONCURRENT = 4;

/** Posts at feed tip to warm once after boot (visible conversation). */
export const FAMILY_FEED_INITIAL_WARM_POST_COUNT = 8;
