import { GENERATED_LEGACY_MAP } from './legacyMap.generated';

const LEGACY_MAP_LOWER: Record<string, string> = Object.fromEntries(
  Object.entries(GENERATED_LEGACY_MAP).map(([k, v]) => [k.toLowerCase(), v]),
);

/** Maps legacy `/images/...` and `/media/...` paths to portable `/storage/media/...` after import. */
export function resolveLegacyStoragePath(legacyPath: string): string | null {
  if (!legacyPath.startsWith('/images/') && !legacyPath.startsWith('/media/')) return null;
  return GENERATED_LEGACY_MAP[legacyPath] ?? LEGACY_MAP_LOWER[legacyPath.toLowerCase()] ?? null;
}
