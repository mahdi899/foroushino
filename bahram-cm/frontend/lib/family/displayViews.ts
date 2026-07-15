/** Public-facing view count multiplier (real views stay in DB / manager panel). */
export const FAMILY_VIEW_DISPLAY_MULTIPLIER = 2.3;

export function displayPostViews(realViews: number): number {
  if (realViews <= 0) return 0;
  return Math.round(realViews * FAMILY_VIEW_DISPLAY_MULTIPLIER);
}
