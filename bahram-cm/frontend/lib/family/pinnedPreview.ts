import type { FamilyPost } from '@/lib/family/types';

export function getPinnedPreview(post: FamilyPost): { label: string; thumbnail: string | null } {
  const blocks = post.blocks ?? [];

  const firstImage = blocks.find((b) => b.type === 'image' && b.media?.url);
  if (firstImage?.media?.url) {
    const text = blocks.find((b) => b.type === 'text' && b.text)?.text;
    return {
      label: text?.trim() || 'عکس',
      thumbnail: firstImage.media.url,
    };
  }

  const imageAlbum = blocks.filter((b) => b.type === 'image' && b.media?.url);
  if (imageAlbum.length > 1) {
    return { label: `آلبوم (${imageAlbum.length} عکس)`, thumbnail: imageAlbum[0]!.media!.url };
  }

  if (blocks.some((b) => b.type === 'video')) {
    const text = blocks.find((b) => b.type === 'text' && b.text)?.text;
    return { label: text?.trim() || 'ویدیو', thumbnail: blocks.find((b) => b.type === 'video')?.media?.url ?? null };
  }

  if (blocks.some((b) => b.type === 'audio')) {
    const text = blocks.find((b) => b.type === 'text' && b.text)?.text;
    return { label: text?.trim() || 'پیام صوتی', thumbnail: null };
  }

  if (post.actions.length > 0) {
    return { label: post.actions[0]!.prompt, thumbnail: null };
  }

  if (blocks.some((b) => b.type === 'article_reference')) {
    const article = blocks.find((b) => b.article)?.article;
    return { label: article?.title ?? 'مقاله', thumbnail: article?.thumbnail ?? null };
  }

  const text = blocks.find((b) => b.type === 'text' && b.text)?.text?.trim();
  return { label: text || 'پیام', thumbnail: null };
}
