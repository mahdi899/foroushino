import { DEFAULT_MEDIA_DOWNLOAD_HOST } from '@/lib/api/config';

function cdnPathFromStorageRef(ref: string): string {
  if (ref.startsWith('/storage/media/')) {
    return ref.slice('/storage'.length);
  }
  return ref;
}

function isLocalOrigin(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/**
 * Stream URL for family voice/video — always the download host (CDN), never localhost /storage.
 * API usually returns an absolute CDN URL; this normalizes legacy /storage and local origins.
 */
export function resolveFamilyMediaPlaybackUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();

  if (trimmed.startsWith('/storage/')) {
    return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${cdnPathFromStorageRef(trimmed)}`;
  }

  if (trimmed.startsWith('/media/')) {
    return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${trimmed}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/storage/')) {
        return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${cdnPathFromStorageRef(parsed.pathname)}`;
      }
      if (isLocalOrigin(parsed.hostname) && parsed.pathname.startsWith('/media/')) {
        return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${parsed.pathname}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  return `${DEFAULT_MEDIA_DOWNLOAD_HOST}/${trimmed.replace(/^\/+/, '')}`;
}

export function resolveFamilyMediaPosterUrl(url: string | null | undefined): string | null {
  return resolveFamilyMediaPlaybackUrl(url);
}
