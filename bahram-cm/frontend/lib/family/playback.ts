export const FAMILY_PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export type FamilyPlaybackSpeed = (typeof FAMILY_PLAYBACK_SPEEDS)[number];

export function formatPlaybackSpeed(rate: number): string {
  if (rate === 1) return '1×';
  return `${rate}×`;
}

export function cyclePlaybackSpeed(current: number): FamilyPlaybackSpeed {
  const idx = FAMILY_PLAYBACK_SPEEDS.findIndex((s) => s === current);
  const next = idx < 0 ? 0 : (idx + 1) % FAMILY_PLAYBACK_SPEEDS.length;
  return FAMILY_PLAYBACK_SPEEDS[next];
}

export function clampSeekPosition(position: number, duration: number): number {
  if (!Number.isFinite(position) || position <= 0) return 0;
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, position);
  return Math.min(duration * 0.999, position);
}
