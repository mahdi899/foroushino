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

function toDownloadHostUrl(pathname: string, search = ''): string {
  return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${pathname}${search}`;
}

/** Canonical CDN path (/media/...), or null when not a media asset we control. */
export function familyMediaPathname(pathname: string): string | null {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized.startsWith('/media/family/') || normalized.startsWith('/media/site/')) {
    return normalized;
  }
  if (normalized.startsWith('/storage/media/family/') || normalized.startsWith('/storage/media/site/')) {
    return cdnPathFromStorageRef(normalized);
  }
  if (normalized.startsWith('/media/')) {
    return normalized;
  }
  return null;
}

/**
 * Stream URL for family voice/video/images — always the download host (cdn.rostami.app).
 * Rewrites rostami.club proxy URLs, legacy /storage paths, and local dev origins.
 */
export function resolveFamilyMediaPlaybackUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();

  if (trimmed.startsWith('/storage/')) {
    return toDownloadHostUrl(cdnPathFromStorageRef(trimmed));
  }

  if (trimmed.startsWith('/media/')) {
    return toDownloadHostUrl(trimmed);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const mediaPath = familyMediaPathname(parsed.pathname);
      if (mediaPath) {
        return toDownloadHostUrl(mediaPath, parsed.search);
      }
      if (parsed.pathname.startsWith('/storage/')) {
        return toDownloadHostUrl(cdnPathFromStorageRef(parsed.pathname), parsed.search);
      }
      if (isLocalOrigin(parsed.hostname) && parsed.pathname.startsWith('/media/')) {
        return toDownloadHostUrl(parsed.pathname, parsed.search);
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  const bare = trimmed.replace(/^\/+/, '');
  if (bare.startsWith('media/')) {
    return toDownloadHostUrl(`/${bare}`);
  }

  return `${DEFAULT_MEDIA_DOWNLOAD_HOST}/${bare}`;
}

export function resolveFamilyMediaPosterUrl(url: string | null | undefined): string | null {
  return resolveFamilyMediaPlaybackUrl(url);
}

/** Direct CDN URL for images and downloads — same download host. */
export function resolveFamilyMediaDownloadUrl(url: string | null | undefined): string | null {
  return resolveFamilyMediaPlaybackUrl(url);
}

/** Images, voice, video — same download-host URL resolver. */
export const resolveFamilyMediaUrl = resolveFamilyMediaPlaybackUrl;
