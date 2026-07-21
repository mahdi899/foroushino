import type { FamilyAction, FamilyPost, FamilyPostBlock } from '@/lib/family/types';

export type FeedListItem =
  | { kind: 'separator'; key: string; label: string }
  | { kind: 'unread'; key: string; count: number }
  | { kind: 'post'; key: string; post: FamilyPost };

/** Bubble chrome: padding, meta row, reactions strip. */
const POST_CHROME_HEIGHT = 88;

function estimateTextHeight(text: string | null | undefined): number {
  const chars = text?.length ?? 0;
  if (chars <= 0) return 0;
  return Math.max(24, Math.ceil(chars / 34) * 22);
}

function estimateBlockHeight(block: FamilyPostBlock): number {
  switch (block.type) {
    case 'text':
      return estimateTextHeight(block.text);
    case 'image':
      return 240;
    case 'video':
      return 280;
    case 'audio':
      return 72;
    case 'article_reference':
      return 108;
    default:
      return 0;
  }
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

/** Rough height guess for virtualizer — measured after mount for accuracy. */
export function estimateFeedItemSize(_index: number, item: FeedListItem): number {
  if (item.kind === 'separator') return 44;
  if (item.kind === 'unread') return 40;

  const post = item.post;
  let height = POST_CHROME_HEIGHT;
  const blocks = post.blocks ?? [];

  for (const block of blocks) {
    height += estimateBlockHeight(block);
  }

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
