/** In-memory map from lead -> open call id (shared by callActions + httpClient). */
const activeCallByLead = new Map<string, number>()

export function registerActiveCall(leadId: string, callId: number): void {
  activeCallByLead.set(leadId, callId)
}

export function getActiveCallId(leadId: string): number | undefined {
  return activeCallByLead.get(leadId)
}

export function clearActiveCall(leadId: string): void {
  activeCallByLead.delete(leadId)
}

/** Wait until /calls/start finishes (native SIM may hang up before the API returns). */
export async function waitForActiveCallId(leadId: string, timeoutMs = 10_000): Promise<number | undefined> {
  const cached = getActiveCallId(leadId)
  if (cached !== undefined) return cached

  const { readCallSession } = await import('./callSession')
  const session = readCallSession()
  if (session?.leadId === leadId && session.callId) {
    registerActiveCall(leadId, session.callId)
    return session.callId
  }

  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    const id = getActiveCallId(leadId)
    if (id !== undefined) return id
    const next = readCallSession()
    if (next?.leadId === leadId && next.callId) {
      registerActiveCall(leadId, next.callId)
      return next.callId
    }
  }

  return undefined
}
