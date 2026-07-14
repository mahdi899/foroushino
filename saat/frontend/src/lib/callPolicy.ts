/** Minimum talk time (seconds) before an agent may end a call and submit a result. */
export const MIN_AGENT_CALL_DURATION_SEC = 90

export function canEndAgentCall(elapsedSec: number): boolean {
  return elapsedSec >= MIN_AGENT_CALL_DURATION_SEC
}

export function remainingAgentCallSec(elapsedSec: number): number {
  return Math.max(0, MIN_AGENT_CALL_DURATION_SEC - elapsedSec)
}
