import type { CallMethod } from '@/lib/call'
import { dialNativePhone } from '@/lib/call'
import { capabilitiesFromSettings, resolveCallMethod } from '@/lib/telephony'
import { useStore } from '@/store/useStore'
import { apiMode, api } from '@/services/index'
import { http } from '@/services/http'
import { syncAppData } from '@/services/sync'
import type { CallResultInput, CallResultOutcome } from '@/services/client'
import { enqueueOfflineWrite, flushOfflineQueue } from '@/services/offlineQueue'

const activeCallByLead = new Map<string, { callId: number; method: CallMethod }>()

export function getActiveCallId(leadId: string): number | undefined {
  return activeCallByLead.get(leadId)?.callId
}

export async function performStartCall(leadId: string, method?: CallMethod): Promise<void> {
  const state = useStore.getState()
  const caps = capabilitiesFromSettings(state.appSettings)
  const resolved = resolveCallMethod(method, caps)

  state.startCall(leadId, resolved)

  if (apiMode !== 'http') return

  try {
    const data = await http.post<{
      call: { id: number | string; method?: string }
      session?: { dial_uri?: string }
    }>('/calls/start', { lead_id: Number(leadId), method: resolved })

    activeCallByLead.set(leadId, { callId: Number(data.call.id), method: resolved })

    if (resolved === 'native' && data.session?.dial_uri) {
      const phone = data.session.dial_uri.replace(/^tel:/, '')
      window.setTimeout(() => dialNativePhone(phone), 280)
    }
  } catch (error) {
    await enqueueOfflineWrite({
      type: 'start_call',
      leadId,
      method: resolved,
      createdAt: new Date().toISOString(),
    })
    throw error
  }
}

export async function performReconcileCall(
  leadId: string,
  outcome: 'answered' | 'no_answer' | 'cancelled',
): Promise<void> {
  if (apiMode !== 'http') return

  const callId = getActiveCallId(leadId)
  if (!callId) return

  await http.post(`/calls/${callId}/reconcile`, { outcome })
}

export async function performSubmitCallResult(input: CallResultInput): Promise<CallResultOutcome> {
  if (apiMode !== 'http') {
    return useStore.getState().submitCallResult(input)
  }

  try {
    const outcome = await api.submitCallResult(input)
    activeCallByLead.delete(input.leadId)

    const payload = await syncAppData()
    useStore.getState().applySyncData(payload)

    useStore.setState({
      activeCallLeadId: null,
      activeCallMethod: null,
      lastOutcome: outcome,
    })

    return outcome
  } catch (error) {
    await enqueueOfflineWrite({
      type: 'submit_call_result',
      input,
      createdAt: new Date().toISOString(),
    })
    throw error
  }
}

export async function performEndCall(durationSec: number): Promise<void> {
  useStore.getState().endCall(durationSec)
}

export async function flushPendingCallWrites(): Promise<void> {
  await flushOfflineQueue()
}
