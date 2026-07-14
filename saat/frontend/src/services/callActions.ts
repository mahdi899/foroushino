import type { CallMethod } from '@/lib/call'
import { capabilitiesFromSettings, resolveCallMethod } from '@/lib/telephony'
import { useStore } from '@/store/useStore'
import { apiMode, api } from '@/services/index'
import { http, NetworkError } from '@/services/http'
import { syncAppData } from '@/services/sync'
import type { CallResultInput, CallResultOutcome } from '@/services/client'
import { enqueueOfflineWrite, flushOfflineQueue } from '@/services/offlineQueue'
import { clearActiveCall, getActiveCallId, registerActiveCall } from '@/services/activeCallRegistry'
import { clearCallSession, saveCallSession } from '@/services/callSession'

export { getActiveCallId }

export async function performStartCall(leadId: string, method?: CallMethod): Promise<void> {
  const state = useStore.getState()
  const caps = capabilitiesFromSettings(state.appSettings)
  const resolved = resolveCallMethod(method, caps)

  if (apiMode !== 'http') {
    state.startCall(leadId, resolved)
    return
  }

  try {
    const data = await http.post<{
      call: { id: number | string; method?: string }
      lead?: unknown
      session?: { dial_uri?: string }
    }>('/calls/start', { lead_id: Number(leadId), method: resolved })

    registerActiveCall(leadId, Number(data.call.id))
    saveCallSession({ leadId, callId: Number(data.call.id) })
    state.startCall(leadId, resolved)

    if (data.lead) {
      void syncAppData()
        .then((payload) => useStore.getState().applySyncData(payload))
        .catch(() => {
          // Call is live on the server; stale cache is fine until the next sync.
        })
    }
  } catch (error) {
    if (error instanceof NetworkError) {
      await enqueueOfflineWrite({
        type: 'start_call',
        leadId,
        method: resolved,
        createdAt: new Date().toISOString(),
      })
    }
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
  const powerDialEnabled = useStore.getState().powerDialEnabled
  const withAdvance = { ...input, advance: input.advance ?? powerDialEnabled }

  if (apiMode !== 'http') {
    return useStore.getState().submitCallResult(withAdvance)
  }

  try {
    const outcome = await api.submitCallResult(withAdvance)
    clearActiveCall(input.leadId)

    try {
      const payload = await syncAppData()
      useStore.getState().applySyncData(payload)
    } catch {
      // Result was saved on the server; stale local cache is acceptable until next sync.
    }

    useStore.setState({
      activeCallLeadId: null,
      activeCallMethod: null,
      lastOutcome: outcome,
    })
    clearCallSession()

    return outcome
  } catch (error) {
    if (error instanceof NetworkError) {
      await enqueueOfflineWrite({
        type: 'submit_call_result',
        input,
        createdAt: new Date().toISOString(),
      })
      throw new NetworkError(
        'ثبت نتیجه ناموفق بود. در صف آفلاین ذخیره شد؛ با برقراری اینترنت دوباره ارسال می‌شود.',
      )
    }
    throw error
  }
}

export async function performEndCall(durationSec: number): Promise<void> {
  useStore.getState().endCall(durationSec)
}

export async function flushPendingCallWrites(): Promise<void> {
  await flushOfflineQueue()
}
