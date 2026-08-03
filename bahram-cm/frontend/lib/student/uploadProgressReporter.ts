/**
 * Throttle upload progress callbacks so XHR events do not spam React re-renders.
 * Always emits 0 and 100 immediately; intermediate values at most every `minIntervalMs`.
 */
export function createUploadProgressReporter(
  onProgress: (percent: number) => void,
  minIntervalMs = 120,
): (percent: number) => void {
  let lastPercent = -1;
  let lastEmitAt = 0;

  return (percent: number) => {
    const safe = Math.min(100, Math.max(0, Math.round(percent)));
    const now = Date.now();
    const force = safe === 0 || safe === 100;

    if (!force && safe === lastPercent) return;
    if (!force && now - lastEmitAt < minIntervalMs) return;

    lastPercent = safe;
    lastEmitAt = now;
    onProgress(safe);
  };
}
