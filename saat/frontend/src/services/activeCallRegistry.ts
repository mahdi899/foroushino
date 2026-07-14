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
