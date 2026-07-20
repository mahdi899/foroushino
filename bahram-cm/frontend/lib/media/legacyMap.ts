import { GENERATED_LEGACY_MAP } from './legacyMap.generated';

const LEGACY_MAP_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(GENERATED_LEGACY_MAP).map(([k, v]) => [k.toLowerCase(), v]),
);

const STORAGE_TO_LEGACY: Record<string, string> = Object.fromEntries(
  Object.entries(GENERATED_LEGACY_MAP).map(([legacy, storage]) => [storage, legacy]),
);

/** Maps legacy `/images/...` and `/media/...` paths to portable `/storage/media/...` after import. */
export function resolveLegacyStoragePath(legacyPath: string): string | null {
  if (!legacyPath.startsWith('/images/') && !legacyPath.startsWith('/media/')) return null;
  return GENERATED_LEGACY_MAP[legacyPath] ?? LEGACY_MAP_LOWER[legacyPath.toLowerCase()] ?? null;
}

/**
 * Canonical storage reference for any legacy public media path.
 * `/media/avatar-sara.svg` → `/storage/media/site/avatar-sara.svg`
 * `/media/site-photos/foo.jpg` → `/storage/media/site/foo.jpg`
 */
export function mediaPathToStorage(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('/storage/')) return trimmed;

  let legacyPath = trimmed;
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/storage/')) return parsed.pathname;
      if (parsed.pathname.startsWith('/cdn/media/')) {
        return parsed.pathname.replace(/^\/cdn\//, '/storage/');
      }
      legacyPath = parsed.pathname;
    }
  } catch {
    /* keep trimmed */
  }

  if (legacyPath.startsWith('/cdn/media/')) {
    return legacyPath.replace(/^\/cdn\//, '/storage/');
  }

  if (!legacyPath.startsWith('/media/') && !legacyPath.startsWith('/images/')) {
    return trimmed;
  }

  const mapped = resolveLegacyStoragePath(legacyPath);
  if (mapped) return mapped;

  let relative = legacyPath.replace(/^\/(?:media|images)\//, '');
  if (relative.startsWith('site-photos/')) {
    return `/storage/media/site/${relative.slice('site-photos/'.length)}`;
  }

  if (relative.startsWith('site/')) {
    return `/storage/media/${relative}`;
  }

  // Gallery imports keep YYYY/MM segments — do not collapse to /storage/media/site/<filename>.
  if (/^\d{4}\/\d{2}\//.test(relative)) {
    return `/storage/media/${relative}`;
  }

  return `/storage/media/site/${relative}`;
}

/** Reverse map — `/storage/media/site/foo.jpg` → `/media/site-photos/foo.jpg`. */
export function legacyPublicPathFromStorage(storagePath: string): string | null {
  if (!storagePath.startsWith('/storage/')) return null;
  return STORAGE_TO_LEGACY[storagePath] ?? null;
}
