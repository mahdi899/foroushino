/** When true, HTML/API/static caching is disabled (developer / no-cache mode). */
export function isCacheDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_CACHE === '1';
}

/** @deprecated Image loader always serves raw `/storage/...` paths. Kept for next.config unoptimized flag only. */
export function isImageOptimizationDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === '1';
}
