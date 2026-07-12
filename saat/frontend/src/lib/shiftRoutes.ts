/** Routes where the agent is actively doing call follow-up work. */
const FOLLOW_UP_WORK_ROUTE_PATTERNS = [
  /^\/dialer\/[^/]+$/,
  /^\/call-result\/[^/]+$/,
  /^\/followups$/,
]

export function isFollowUpWorkRoute(pathname: string): boolean {
  return FOLLOW_UP_WORK_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname))
}

export const AWAY_CHECK_INTERVAL_MS = 5 * 60_000
