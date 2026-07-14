/** Minimum talk time (seconds) before an agent may end a call. 0 = disabled. */
export function canEndAgentCall(elapsedSec: number, minDurationSec: number): boolean {
  if (minDurationSec <= 0) return true
  return elapsedSec >= minDurationSec
}

export function remainingAgentCallSec(elapsedSec: number, minDurationSec: number): number {
  if (minDurationSec <= 0) return 0
  return Math.max(0, minDurationSec - elapsedSec)
}

export function isMinCallDurationEnabled(minDurationSec: number): boolean {
  return minDurationSec > 0
}
