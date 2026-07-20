import { DEFAULT_MEDIA_DOWNLOAD_HOST } from '@/lib/api/config';
import { MEDIA_HOSTS } from '@/lib/media/hosts.generated';

/** Canonical playback host for family voice/video/images. */
export const FAMILY_MEDIA_PLAYBACK_HOST = (
  process.env.NEXT_PUBLIC_FAMILY_MEDIA_CDN_URL ||
  MEDIA_HOSTS.family_media_cdn_url ||
  DEFAULT_MEDIA_DOWNLOAD_HOST
).replace(/\/$/, '');

const FAMILY_MEDIA_PREFIX = '/media/family/';
const SITE_MEDIA_PREFIX = '/media/site/';

function cdnPathFromStorageRef(ref: string): string {
  if (ref.startsWith('/storage/media/')) {
    return ref.slice('/storage'.length);
  }
  return ref;
}

function isLocalOrigin(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function toPlaybackHostUrl(pathname: string, search = ''): string {
  return `${FAMILY_MEDIA_PLAYBACK_HOST}${pathname}${search}`;
}

/** Hosts that proxy /media/family — video Range + SW break; always rewrite to CDN. */
function isFamilyMediaProxyHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return (
    host === 'rostami.club' ||
    host === 'www.rostami.club' ||
    host === 'family-cdn.rostami.club' ||
    host === 'rostami.app' ||
    host === 'www.rostami.app'
  );
}

/** Canonical CDN path (/media/...), or null when not a media asset we control. */
export function familyMediaPathname(pathname: string): string | null {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized.startsWith(FAMILY_MEDIA_PREFIX) || normalized.startsWith(SITE_MEDIA_PREFIX)) {
    return normalized;
  }
  if (
    normalized.startsWith('/storage/media/family/') ||
    normalized.startsWith('/storage/media/site/')
  ) {
    return cdnPathFromStorageRef(normalized);
  }
  if (normalized.startsWith('/media/')) {
    return normalized;
  }
  return null;
}

function rewriteKnownMediaUrl(trimmed: string): string | null {
  if (trimmed.startsWith('/storage/')) {
    return toPlaybackHostUrl(cdnPathFromStorageRef(trimmed));
  }

  if (trimmed.startsWith('/media/')) {
    return toPlaybackHostUrl(trimmed);
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const mediaPath = familyMediaPathname(parsed.pathname);
      if (mediaPath) {
        return toPlaybackHostUrl(mediaPath, parsed.search);
      }
      if (parsed.pathname.startsWith('/storage/')) {
        return toPlaybackHostUrl(cdnPathFromStorageRef(parsed.pathname), parsed.search);
      }
      if (isLocalOrigin(parsed.hostname) && parsed.pathname.startsWith('/media/')) {
        return toPlaybackHostUrl(parsed.pathname, parsed.search);
      }
      // Legacy API may still emit club/app proxy URLs without /media path normalization.
      if (isFamilyMediaProxyHost(parsed.hostname) && mediaPath === null) {
        const bare = parsed.pathname.replace(/^\/+/, '');
        if (bare.startsWith('media/family/') || bare.startsWith('media/site/')) {
          return toPlaybackHostUrl(`/${bare}`, parsed.search);
        }
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  const bare = trimmed.replace(/^\/+/, '');
  if (bare.startsWith('media/family/') || bare.startsWith('media/site/') || bare.startsWith('media/')) {
    return toPlaybackHostUrl(`/${bare}`);
  }

  return null;
}

/**
 * Stream URL for family voice/video/images — always the download host (cdn.rostami.app).
 * Rewrites rostami.club proxy URLs, legacy /storage paths, and local dev origins.
 */
export function resolveFamilyMediaPlaybackUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  const rewritten = rewriteKnownMediaUrl(url.trim());
  if (rewritten) return rewritten;

  return `${FAMILY_MEDIA_PLAYBACK_HOST}/${url.trim().replace(/^\/+/, '')}`;
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
