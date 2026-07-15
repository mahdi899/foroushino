import type { FamilyPost } from '@/lib/family/types';
import { getPinnedPreview } from '@/lib/family/pinnedPreview';
import { formatPostDateTime } from '@/lib/family/datetime';

export function getPostListPreview(post: FamilyPost): {
  label: string;
  thumbnail: string | null;
  kind: string;
} {
  const { label, thumbnail } = getPinnedPreview(post);

  const kind = post.actions.length > 0
    ? 'اکشن'
    : post.type === 'voice'
      ? 'صوت'
      : post.type === 'video'
        ? 'ویدیو'
        : post.type === 'image' || post.type === 'image_album'
          ? 'عکس'
          : post.type === 'article'
            ? 'مقاله'
            : 'پیام';

  return { label, thumbnail, kind };
}

export function formatPostListTime(iso: string | null | undefined): string {
  if (!iso) return '';
  return formatPostDateTime(iso);
}
