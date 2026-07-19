/** Public-facing member count: real count × 10, ones digit = hour % 10 (e.g. 6 members at 04:xx → 64). */
export function inflatedMemberCount(memberCount: number, hour = new Date().getHours()): number {
  const base = Math.max(0, Math.floor(memberCount));
  return base * 10 + (hour % 10);
}
