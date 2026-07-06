import { persistMediaUrl, resolveMediaUrl, normalizeAdminMediaUrl } from '@/lib/mediaUrl';
import type { AdminMediaItem } from '@/lib/admin/mediaTypes';

export type UnifiedMediaItem = {
  key: string;
  src: string;
  persistSrc: string;
  label: string;
  category: string;
  kind: 'uploaded' | 'static';
  id?: number;
  mime?: string | null;
  adminItem?: AdminMediaItem;
};

export function buildUnifiedGallery(uploaded: AdminMediaItem[]): UnifiedMediaItem[] {
  const items: UnifiedMediaItem[] = [];
  const seen = new Set<string>();

  for (const row of uploaded) {
    const persistSrc = row.persistSrc || persistMediaUrl(row.url);
    if (!persistSrc || seen.has(persistSrc)) continue;
    seen.add(persistSrc);
    items.push({
      key: `media-${row.id}`,
      src: normalizeAdminMediaUrl(row.url) || resolveMediaUrl(persistSrc),
      persistSrc,
      label: row.label,
      category: row.category || 'آپلود شده',
      kind: 'uploaded',
      id: row.id,
      mime: row.mime,
      adminItem: row,
    });
  }

  return items;
}

export function filterUnifiedGallery(
  items: UnifiedMediaItem[],
  category: string,
): UnifiedMediaItem[] {
  if (category === 'همه') return items;
  return items.filter((item) => item.category === category);
}

export function findUnifiedByPersistSrc(
  items: UnifiedMediaItem[],
  value: string,
): UnifiedMediaItem | undefined {
  const normalized = persistMediaUrl(value) || resolveMediaUrl(value);
  return items.find(
    (item) =>
      item.persistSrc === normalized ||
      item.src === normalized ||
      resolveMediaUrl(item.persistSrc) === resolveMediaUrl(value),
  );
}
