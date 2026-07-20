import { DEFAULT_MEDIA_DOWNLOAD_HOST } from '@/lib/api/config';
import { FAMILY_DOMAIN, isFamilyHost } from '@/lib/domains';

const CDN_HOSTS = new Set(['cdn.rostami.app', 'family-cdn.rostami.club']);

function cdnPathFromStorageRef(ref: string): string {
  if (ref.startsWith('/storage/media/')) {
    return ref.slice('/storage'.length);
  }
  return ref;
}

function isLocalOrigin(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Canonical `/media/family/...` path, or null when not family media. */
export function familyMediaPathname(pathname: string): string | null {
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized.startsWith('/media/family/')) return normalized;
  if (normalized.startsWith('/storage/media/family/')) {
    return cdnPathFromStorageRef(normalized);
  }
  return null;
}

function browserFamilyOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  if (!isFamilyHost(window.location.hostname)) return null;
  return window.location.origin;
}

function resolveFamilyPath(pathname: string, search = ''): string | null {
  const familyPath = familyMediaPathname(pathname);
  if (!familyPath) return null;

  const sameOrigin = browserFamilyOrigin();
  if (sameOrigin) {
    return `${sameOrigin}${familyPath}${search}`;
  }

  if (typeof window !== 'undefined' && isLocalOrigin(window.location.hostname)) {
    if (pathname.startsWith('/storage/')) {
      return `${window.location.origin}${pathname}${search}`;
    }
  }

  return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${familyPath}${search}`;
}

function rewriteAbsoluteFamilyUrl(url: URL): string | null {
  const familyPath = familyMediaPathname(url.pathname);
  if (!familyPath) return null;

  const sameOrigin = browserFamilyOrigin();
  if (sameOrigin) {
    const host = url.hostname.toLowerCase();
    const familyHost = FAMILY_DOMAIN.toLowerCase();
    if (
      CDN_HOSTS.has(host) ||
      host === familyHost ||
      host === `www.${familyHost}`
    ) {
      return `${sameOrigin}${familyPath}${url.search}`;
    }
  }

  if (isLocalOrigin(url.hostname) && url.pathname.startsWith('/storage/media/family/')) {
    return url.toString();
  }

  return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${familyPath}${url.search}`;
}

/**
 * Stream URL for family voice/video/images.
 * On rostami.club → same-origin `/media/family/*` (nginx proxy, no CORS).
 * Else → download host (CDN).
 */
export function resolveFamilyMediaPlaybackUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();

  if (trimmed.startsWith('/storage/')) {
    const family = resolveFamilyPath(trimmed);
    if (family) return family;
    return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${cdnPathFromStorageRef(trimmed)}`;
  }

  if (trimmed.startsWith('/media/family/')) {
    return resolveFamilyPath(trimmed);
  }

  if (trimmed.startsWith('/media/')) {
    return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${trimmed}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const rewritten = rewriteAbsoluteFamilyUrl(parsed);
      if (rewritten) return rewritten;

      if (parsed.pathname.startsWith('/storage/')) {
        const family = resolveFamilyPath(parsed.pathname, parsed.search);
        if (family) return family;
        return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${cdnPathFromStorageRef(parsed.pathname)}${parsed.search}`;
      }

      if (isLocalOrigin(parsed.hostname) && parsed.pathname.startsWith('/media/family/')) {
        return resolveFamilyPath(parsed.pathname, parsed.search);
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  const bare = trimmed.replace(/^\/+/, '');
  if (bare.startsWith('media/family/')) {
    return resolveFamilyPath(`/${bare}`);
  }

  return `${DEFAULT_MEDIA_DOWNLOAD_HOST}/${bare}`;
}

/** Direct file URL on the download host — for `<a download>` and story image src. */
export function resolveFamilyMediaDownloadUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;

  const trimmed = url.trim();

  if (trimmed.startsWith('/storage/')) {
    const familyPath = familyMediaPathname(trimmed);
    if (familyPath) return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${familyPath}`;
    return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${cdnPathFromStorageRef(trimmed)}`;
  }

  if (trimmed.startsWith('/media/family/')) {
    return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${trimmed}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const familyPath = familyMediaPathname(parsed.pathname);
      if (familyPath) {
        return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${familyPath}${parsed.search}`;
      }
      if (parsed.pathname.startsWith('/storage/')) {
        return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${cdnPathFromStorageRef(parsed.pathname)}${parsed.search}`;
      }
    } catch {
      return trimmed;
    }
    return trimmed;
  }

  const playback = resolveFamilyMediaPlaybackUrl(trimmed);
  if (!playback) return null;

  try {
    const parsed = new URL(playback, typeof window !== 'undefined' ? window.location.origin : undefined);
    const familyPath = familyMediaPathname(parsed.pathname);
    if (familyPath) {
      return `${DEFAULT_MEDIA_DOWNLOAD_HOST}${familyPath}${parsed.search}`;
    }
  } catch {
    /* fall through */
  }

  return playback;
}

export function resolveFamilyMediaPosterUrl(url: string | null | undefined): string | null {
  return resolveFamilyMediaPlaybackUrl(url);
}

/** Images, voice, video — same playback resolver. */
export const resolveFamilyMediaUrl = resolveFamilyMediaPlaybackUrl;
