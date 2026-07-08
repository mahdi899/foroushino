/** When true, HTML/API/static caching is disabled (developer / no-cache mode). */
export function isCacheDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_CACHE === '1';
}

/** When true, images bypass Next.js optimizer (original bytes). Default: optimized delivery. */
export function isImageOptimizationDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === '1';
}
