import { persistMediaUrl, resolveMediaUrl, normalizeAdminMediaUrl, isAdminMediaOnRemoteHost } from '@/lib/mediaUrl';
import type { AdminMediaItem } from '@/lib/admin/mediaTypes';
import { buildStaticGallery } from '@/lib/admin/galleryImages';

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

export type BuildUnifiedGalleryOptions = {
  /** عکس‌های ثابت SITE_MEDIA — فقط وقتی true باشد به انتهای لیست اضافه می‌شوند. */
  includeStaticSitePhotos?: boolean;
};

export function staticSitePhotoCount(): number {
  return buildStaticGallery().length;
}

export function buildUnifiedGallery(
  uploaded: AdminMediaItem[],
  options: BuildUnifiedGalleryOptions = {},
): UnifiedMediaItem[] {
  const { includeStaticSitePhotos = true } = options;
  const items: UnifiedMediaItem[] = [];
  const seen = new Set<string>();

  for (const row of uploaded) {
    const persistSrc = row.persistSrc || persistMediaUrl(row.url);
    if (!persistSrc || seen.has(persistSrc)) continue;
    seen.add(persistSrc);
    items.push({
      key: `media-${row.id}`,
      src: isAdminMediaOnRemoteHost(row)
        ? row.url || `/api/admin/media/${row.id}/file`
        : normalizeAdminMediaUrl(row.legacyPath ?? row.url) ||
          normalizeAdminMediaUrl(row.url) ||
          resolveMediaUrl(persistSrc),
      persistSrc,
      label: row.label,
      category: row.category || 'آپلود شده',
      kind: 'uploaded',
      id: row.id,
      mime: row.mime,
      adminItem: row,
    });
  }

  if (includeStaticSitePhotos) {
    for (const staticItem of buildStaticGallery()) {
      const persistSrc = persistMediaUrl(staticItem.src);
      if (!persistSrc || seen.has(persistSrc)) continue;
      seen.add(persistSrc);
      items.push({
        key: `static-${staticItem.src}`,
        src: staticItem.src,
        persistSrc,
        label: staticItem.label,
        category: staticItem.category,
        kind: 'static',
      });
    }
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
