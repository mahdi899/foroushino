import type { FamilyAction, FamilyPost, FamilyPostBlock } from '@/lib/family/types';

export type FeedListItem =
  | { kind: 'separator'; key: string; label: string }
  | { kind: 'unread'; key: string; count: number }
  | { kind: 'install-promo'; key: string; afterPostCount: number }
  | { kind: 'post'; key: string; post: FamilyPost };

/** Bubble chrome: meta row + reactions strip (measured ≈72–96 on mobile). */
const POST_CHROME_HEIGHT = 76;

/**
 * Must stay aligned with `family.css` media caps:
 * --family-media-max-w ≈ 24rem, --family-media-max-h ≈ min(70dvh, 26rem),
 * --family-media-album-max-h ≈ min(70dvh, 24rem).
 * Wrong caps → virtualizer estimate→measure thrash and scroll jumps.
 */
const FEED_CONTENT_WIDTH = 340;
const MEDIA_MAX_H = 416; // 26rem
const ALBUM_MAX_H = 384; // 24rem
const VIDEO_MAX_H = 416;

function estimateTextHeight(text: string | null | undefined): number {
  const chars = text?.length ?? 0;
  if (chars <= 0) return 0;
  // Persian glyphs are wider than Latin; ~28 chars/line on a ~340px bubble.
  return Math.max(22, Math.ceil(chars / 28) * 24);
}

function aspectHeight(width: number, height: number, maxH: number): number {
  if (width <= 0) return Math.min(maxH, 220);
  return Math.min(maxH, Math.max(120, Math.round((FEED_CONTENT_WIDTH * height) / width)));
}

function estimateImageHeight(media: FamilyPostBlock['media']): number {
  if (media?.width && media?.height && media.width > 0) {
    return aspectHeight(media.width, media.height, MEDIA_MAX_H);
  }
  return 220;
}

function estimateVideoHeight(media: FamilyPostBlock['media']): number {
  if (media?.width && media?.height && media.width > 0) {
    return aspectHeight(media.width, media.height, VIDEO_MAX_H);
  }
  return 240;
}

/** Match PostCard ImageAlbumBlock intrinsic layouts so estimates don't collapse. */
function estimateAlbumHeight(count: number): number {
  if (count <= 1) return 220;
  if (count === 2) return Math.min(ALBUM_MAX_H, 168);
  if (count === 3) return Math.min(ALBUM_MAX_H, Math.round(FEED_CONTENT_WIDTH * 0.8)); // aspect 5/4
  if (count === 4) return Math.min(ALBUM_MAX_H, FEED_CONTENT_WIDTH); // aspect square
  // 5+: aspect 4/5 grid (see ImageAlbumBlock) clipped by album max-h
  return Math.min(ALBUM_MAX_H, Math.round(FEED_CONTENT_WIDTH * 1.25));
}

function estimateActionHeight(action: FamilyAction): number {
  let height = 20 + estimateTextHeight(action.prompt);
  const optionCount = action.options?.length ?? 0;
  const hasResults = (action.results?.total ?? 0) > 0;

  switch (action.type) {
    case 'single_choice':
    case 'multi_choice':
      if (hasResults || action.responded) {
        height += optionCount * 38 + 32;
      } else {
        height += optionCount * 46 + Math.max(0, optionCount - 1) * 5 + 48;
        height += 22;
      }
      break;
    case 'confirmation':
      height += hasResults || action.responded ? 88 : 56;
      break;
    case 'commitment':
      height += 48;
      break;
    case 'short_text':
      height += 96;
      break;
    case 'scale': {
      const min = typeof action.config?.min === 'number' ? action.config.min : 1;
      const max = typeof action.config?.max === 'number' ? action.config.max : 10;
      const count = Math.max(1, max - min + 1);
      height += Math.ceil(count / 5) * 42 + 48;
      break;
    }
    case 'number':
      height += 72;
      break;
    default:
      height += 48;
  }

  return height;
}

/**
 * Walk blocks like PostCard: consecutive images become one album row.
 * Summing per-image heights was overshooting and fighting CSS max-height.
 */
function estimatePostBlocksHeight(blocks: FamilyPostBlock[]): number {
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  let height = 0;
  let imageBatch: FamilyPostBlock['media'][] = [];

  const flushImages = () => {
    if (imageBatch.length === 1) {
      height += estimateImageHeight(imageBatch[0] ?? null);
    } else if (imageBatch.length > 1) {
      height += estimateAlbumHeight(imageBatch.length);
    }
    imageBatch = [];
  };

  for (const block of sorted) {
    if (block.type === 'image' && block.media) {
      imageBatch.push(block.media);
      continue;
    }

    flushImages();

    switch (block.type) {
      case 'text':
        height += estimateTextHeight(block.text);
        break;
      case 'video':
        height += estimateVideoHeight(block.media);
        break;
      case 'audio':
        height += 72;
        break;
      case 'article_reference':
        height += 108;
        break;
      default:
        break;
    }
  }

  flushImages();
  return height;
}

/** Rough height guess for virtualizer — measured after mount for accuracy. */
export function estimateFeedItemSize(_index: number, item: FeedListItem): number {
  if (item.kind === 'separator') return 44;
  if (item.kind === 'unread') return 40;
  if (item.kind === 'install-promo') return 108;

  const post = item.post;
  let height = POST_CHROME_HEIGHT;
  height += estimatePostBlocksHeight(post.blocks ?? []);

  for (const action of post.actions ?? []) {
    height += estimateActionHeight(action);
  }

  if ((post.comment_preview?.length ?? 0) > 0) {
    height += 56;
  }

  if (post.reply_context) {
    height += 48;
  }

  if (post.is_pinned || post.is_important) {
    height += 24;
  }

  return Math.max(height, 80);
}
