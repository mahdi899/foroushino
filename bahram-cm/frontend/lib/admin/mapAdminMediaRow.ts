import { persistMediaUrl, resolveMediaUrl, normalizeAdminMediaUrl, isAdminMediaOnRemoteHost } from '@/lib/mediaUrl';
import type { AdminMediaItem } from '@/lib/admin/mediaTypes';

function remoteAdminMediaUrl(id: number, viewUrl?: string | null): string {
  const normalized = normalizeAdminMediaUrl(viewUrl);
  if (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    normalized.startsWith('/api/admin/media/')
  ) {
    return normalized;
  }

  return `/api/admin/media/${id}/file`;
}

export function mapAdminMediaRow(m: {
  id: number;
  url?: string | null;
  view_url?: string | null;
  legacy_path?: string | null;
  alt_fa?: string | null;
  category?: string | null;
  mime?: string | null;
  width?: number | null;
  height?: number | null;
  disk?: string | null;
  is_remote?: boolean | null;
}): AdminMediaItem {
  const ref = m.url || m.legacy_path || '';
  const persistSrc = persistMediaUrl(ref);
  const isRemote = isAdminMediaOnRemoteHost({ isRemote: m.is_remote, disk: m.disk });
  const displayUrl = isRemote
    ? remoteAdminMediaUrl(m.id, m.view_url)
    : normalizeAdminMediaUrl(m.legacy_path) ||
      normalizeAdminMediaUrl(m.view_url || resolveMediaUrl(persistSrc));

  return {
    id: m.id,
    url: displayUrl,
    persistSrc,
    legacyPath: m.legacy_path ?? null,
    label: m.alt_fa?.trim() || 'آپلود شده',
    category: m.category?.trim() || 'آپلود شده',
    mime: m.mime,
    width: m.width ?? null,
    height: m.height ?? null,
    disk: m.disk ?? undefined,
    isRemote: isRemote || undefined,
  };
}
