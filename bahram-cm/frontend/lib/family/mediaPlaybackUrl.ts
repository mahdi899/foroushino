import { DEFAULT_MEDIA_DOWNLOAD_HOST } from '@/lib/api/config';
import { appPublicOrigin, familyPublicOrigin, isFamilyHost } from '@/lib/domains';
import { MEDIA_HOSTS } from '@/lib/media/hosts.generated';

/** Canonical playback host for family voice/video/images. */
export const FAMILY_MEDIA_PLAYBACK_HOST = (
  process.env.NEXT_PUBLIC_FAMILY_MEDIA_CDN_URL ||
  MEDIA_HOSTS.family_media_cdn_url ||
  DEFAULT_MEDIA_DOWNLOAD_HOST
).replace(/\/$/, '');

const FAMILY_MEDIA_PREFIX = '/media/family/';
const SITE_MEDIA_PREFIX = '/media/site/';

/** Legacy mediaPathToStorage nested family assets under /storage/media/site/family/. */
export function normalizeFamilyGalleryMediaPath(pathname: string): string {
  if (pathname.startsWith('/media/site/family/')) {
    return pathname.replace('/media/site/family/', '/media/family/');
  }
  if (pathname.startsWith('/storage/media/site/family/')) {
    return pathname.replace('/storage/media/site/family/', '/media/family/');
  }
  return pathname;
}

function cdnPathFromStorageRef(ref: string): string {
  if (ref.startsWith('/storage/media/')) {
    return normalizeFamilyGalleryMediaPath(ref.slice('/storage'.length));
  }
  return normalizeFamilyGalleryMediaPath(ref);
}

function isLocalOrigin(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Hosts where /media/family is same-origin proxied with Content-Disposition: inline. */
export function isFamilyMediaSameOriginHost(hostname: string): boolean {
  if (isFamilyHost(hostname)) return true;
  const host = hostname.toLowerCase();
  if (host === 'rostami.club' || host === 'www.rostami.club') return true;
  const appOrigin = appPublicOrigin();
  if (appOrigin) {
    try {
      if (new URL(appOrigin).hostname.toLowerCase() === host) return true;
    } catch {
      // ignore
    }
  }
  return host === 'rostami.app' || host === 'www.rostami.app';
}

/** Site origin that proxies /media/family (club nginx or Next middleware on app). */
function familyMediaProxyOrigin(): string | null {
  if (typeof window !== 'undefined' && isFamilyMediaSameOriginHost(window.location.hostname)) {
    return window.location.origin;
  }
  return familyPublicOrigin() || appPublicOrigin() || null;
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
  const normalized = normalizeFamilyGalleryMediaPath(
    pathname.startsWith('/') ? pathname : `/${pathname}`,
  );
  if (normalized.startsWith(FAMILY_MEDIA_PREFIX) || normalized.startsWith(SITE_MEDIA_PREFIX)) {
    return normalizeFamilyGalleryMediaPath(normalized);
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

/** Guess MIME from API hint or file extension (helps `<video>` / `<source type>`). */
export function inferFamilyMediaMimeType(
  url: string,
  declared?: string | null,
): string | undefined {
  const mime = declared?.trim().toLowerCase();
  if (mime && mime !== 'application/octet-stream') return mime;

  const ext = url.split('?')[0]?.split('#')[0]?.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4':
    case 'm4v':
      return 'video/mp4';
    case 'webm':
      return 'video/webm';
    case 'mov':
      return 'video/quicktime';
    case 'm4a':
      return 'audio/mp4';
    case 'mp3':
      return 'audio/mpeg';
    case 'ogg':
      return 'audio/ogg';
    case 'webp':
      return 'image/webp';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    default:
      return undefined;
  }
}

function clubSameOriginMediaUrl(url: string | null | undefined): string | null {
  const primary = resolveFamilyMediaPlaybackUrl(url);
  const origin = familyMediaProxyOrigin();
  if (!primary || !origin) return null;

  try {
    const parsed = new URL(primary);
    const mediaPath = familyMediaPathname(parsed.pathname);
    if (!mediaPath) return null;

    return `${origin}${normalizeFamilyGalleryMediaPath(mediaPath)}${parsed.search}`;
  } catch {
    return null;
  }
}

/**
<<<<<<< HEAD
 * Playback URLs — same-origin /media/family/* first (inline + Range), CDN fallback last.
=======
 * Playback URLs — direct CDN file links first; same-origin club proxy as fallback (Range/CORS).
 * Images/voice/video should hit cdn.rostami.app in dev — club /media/family proxy needs nginx/middleware.
>>>>>>> 6f5843535344db556f9cf6397711bcaa58d51cef
 */
export function resolveFamilyMediaPlaybackCandidates(
  url: string | null | undefined,
  _mediaId?: number,
): string[] {
  const candidates: string[] = [];

<<<<<<< HEAD
  const proxied = clubSameOriginMediaUrl(url);
  if (proxied) candidates.push(proxied);

=======
>>>>>>> 6f5843535344db556f9cf6397711bcaa58d51cef
  const primary = resolveFamilyMediaPlaybackUrl(url);
  if (primary) candidates.push(primary);

  const club = clubSameOriginMediaUrl(url);
  if (club && !candidates.includes(club)) candidates.push(club);

  return candidates;
}

/** @deprecated Use resolveFamilyMediaPlaybackCandidates — kept for call-site compatibility. */
export const resolveFamilyMediaStreamCandidates = resolveFamilyMediaPlaybackCandidates;

export function resolveFamilyMediaStreamUrl(
  url: string | null | undefined,
  mediaId?: number,
): string | null {
  const candidates = resolveFamilyMediaPlaybackCandidates(url, mediaId);
  return candidates[0] ?? resolveFamilyMediaPlaybackUrl(url);
}
