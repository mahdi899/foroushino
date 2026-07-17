import type { FamilyPost } from '@/lib/family/types';

export type FeedListItem =
  | { kind: 'separator'; key: string; label: string }
  | { kind: 'unread'; key: string; count: number }
  | { kind: 'post'; key: string; post: FamilyPost };

const FEED_ITEM_GAP = 8;

/** Rough height guess for virtualizer — measured after mount for accuracy. */
export function estimateFeedItemSize(_index: number, item: FeedListItem): number {
  if (item.kind === 'separator') return 40 + FEED_ITEM_GAP;
  if (item.kind === 'unread') return 36 + FEED_ITEM_GAP;

  const post = item.post;
  let height = 84;
  const blocks = post.blocks ?? [];

  for (const block of blocks) {
    switch (block.type) {
      case 'text': {
        const chars = block.text?.length ?? 0;
        height += Math.max(24, Math.ceil(chars / 40) * 22);
        break;
      }
      case 'image':
        height += 240;
        break;
      case 'video':
        height += 280;
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

  height += (post.actions?.length ?? 0) * 64;

  if ((post.comment_preview?.length ?? 0) > 0) {
    height += 52;
  }

  if (post.reply_context) {
    height += 44;
  }

  return Math.min(Math.max(height, 72), 720) + FEED_ITEM_GAP;
}
