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

/** Reverse map — `/storage/media/site/foo.jpg` → `/media/site-photos/foo.jpg`. */
export function legacyPublicPathFromStorage(storagePath: string): string | null {
  if (!storagePath.startsWith('/storage/')) return null;
  return STORAGE_TO_LEGACY[storagePath] ?? null;
}
