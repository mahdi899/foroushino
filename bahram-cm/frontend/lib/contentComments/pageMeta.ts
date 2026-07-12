import type { ContentCommentType } from '@/lib/services/contentComments.types';
import {
  CONTENT_COMMENT_PUBLIC_PATH,
  CONTENT_COMMENT_TYPE_LABELS,
} from '@/lib/services/contentComments.types';

export type ContentCommentPageMeta = {
  key: string;
  type: ContentCommentType;
  slug: string;
  label: string;
  path: string;
};

const PAGE_LABEL_OVERRIDES: Record<string, string> = {
  'campaign_writing:campaign-writing': 'دوره کمپین‌نویسی',
};

export function getContentCommentPageMeta(
  type: ContentCommentType,
  slug: string,
): ContentCommentPageMeta {
  const key = `${type}:${slug}`;
  const label =
    PAGE_LABEL_OVERRIDES[key] ??
    `${CONTENT_COMMENT_TYPE_LABELS[type]} — ${slug.replace(/-/g, '\u200c')}`;

  return {
    key,
    type,
    slug,
    label,
    path: CONTENT_COMMENT_PUBLIC_PATH[type](slug),
  };
}

export function groupCommentsByPage<T extends { content_type: ContentCommentType; content_slug: string }>(
  items: T[],
): { meta: ContentCommentPageMeta; items: T[] }[] {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const key = `${item.content_type}:${item.content_slug}`;
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([key, grouped]) => {
      const [type, slug] = key.split(':') as [ContentCommentType, string];
      return {
        meta: getContentCommentPageMeta(type, slug),
        items: grouped,
      };
    })
    .sort((a, b) => a.meta.label.localeCompare(b.meta.label, 'fa'));
}
