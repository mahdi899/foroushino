// Real backend implementation of the `ApiClient` contract (Laravel «فروشینو»
// API). Implements the exact same interface as `mockClient.ts`, so flipping
// `services/index.ts` is the only change required anywhere else in the app.
import type { ApiClient, CallResultInput, CallResultOutcome, FollowupInput } from './client'
import type { Availability, Followup, NextAction, PaymentMethod } from '@/types'
import { nextActionLabels } from '@/data/labels'
import { ApiError, http, newIdempotencyKey } from './http'
import { clearActiveCall, getActiveCallId, registerActiveCall } from './activeCallRegistry'
import { readCallSession } from './callSession'
import { mapFollowup, mapSuggestion } from './mappers'
import type { Suggestion } from './logic'

type CallSummary = { id: number | string; result: string | null }

async function resolveCallId(leadId: string): Promise<number> {
  const cached = getActiveCallId(leadId)
  if (cached !== undefined) return cached

  const session = readCallSession()
  if (session?.leadId === leadId && session.callId) {
    registerActiveCall(leadId, session.callId)
    return session.callId
  }

  const calls = await http.get<CallSummary[]>(`/calls?lead_id=${Number(leadId)}`)
  const open =
    [...calls].reverse().find((call) => call.result == null) ??
    [...calls].reverse()[0]
  if (!open?.id) {
    throw new Error('هیچ تماس فعالی برای این مشتری یافت نشد. ابتدا تماس را شروع کن.')
  }

  const callId = Number(open.id)
  registerActiveCall(leadId, callId)
  return callId
}

export const httpClient: ApiClient = {
  async startShift(availability: Availability = 'available') {
    await http.post('/shift/start', { availability })
  },

  async endShift() {
    await http.post('/shift/end')
  },

  async setAvailability(status: Availability) {
    await http.post('/shift/availability', { availability: status })
  },

  async getNextLead(): Promise<Suggestion | null> {
    try {
      const data = await http.post<{ lead: unknown; reason: string }>('/leads/next')
      return mapSuggestion(data)
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null
      throw e
    }
  },

  async lockLead(leadId: string): Promise<{ ok: boolean; lockedByOther?: boolean }> {
    try {
      await http.post(`/leads/${leadId}/lock`)
      return { ok: true }
    } catch (e) {
      if (e instanceof ApiError && (e.status === 403 || e.status === 422)) {
        return { ok: false, lockedByOther: true }
      }
      throw e
    }
  },

  async releaseLead(leadId: string) {
    await http.post(`/leads/${leadId}/release`)
  },

  async returnLeadToPool(leadId: string) {
    await http.post(`/leads/${leadId}/return-to-pool`)
  },

  async reclaimLead(leadId: string) {
    await http.post(`/leads/${leadId}/reclaim`)
  },

  async startCall(leadId: string, method: 'native' | 'voip' = 'native') {
    const data = await http.post<{ call: { id: number | string } }>('/calls/start', {
      lead_id: Number(leadId),
      method,
    })
    registerActiveCall(leadId, Number(data.call.id))
  },

  async submitCallResult(input: CallResultInput): Promise<CallResultOutcome> {
    const callId = await resolveCallId(input.leadId)
    const trimmedNote = (input.note ?? '').trim()

    const payload: Record<string, unknown> = {
      result: input.result,
      note: trimmedNote || undefined,
      duration_sec: input.durationSec,
      objection: input.objection ?? undefined,
      rating: input.rating || undefined,
    }
    if (input.followupAt) {
      payload.follow_up = {
        due_at: input.followupAt,
        kind: input.followupKind,
        priority: 2,
      }
    }
    if (input.saleAmount !== undefined) {
      payload.sale = { amount: input.saleAmount }
    }
    if (input.advance) {
      payload.advance = true
    }

    const idempotencyKey = input.idempotencyKey ?? newIdempotencyKey()
    const data = await http.post<{
      follow_up: unknown | null
      sale: { id: string | number } | null
      next_action: string
      next_lead?: unknown
      next_reason?: string
    }>(`/calls/${callId}/result`, payload, idempotencyKey)

    clearActiveCall(input.leadId)

    const outcome: CallResultOutcome = {
      nextActionLabel: nextActionLabels[data.next_action as NextAction] ?? '',
      createdSaleId: data.sale ? String(data.sale.id) : null,
      createdFollowupId:
        data.follow_up && typeof data.follow_up === 'object' && 'id' in (data.follow_up as Record<string, unknown>)
          ? String((data.follow_up as Record<string, unknown>).id)
          : null,
      suggestion: null,
      savedNote: trimmedNote || null,
    }

    // Result is already saved — fetching the next lead is best-effort only.
    try {
      if (data.next_lead && data.next_reason) {
        outcome.suggestion = mapSuggestion({ lead: data.next_lead, reason: data.next_reason })
      } else if (input.advance) {
        try {
          const next = await http.post<{ lead: unknown; reason: string }>('/leads/next')
          outcome.suggestion = mapSuggestion(next)
        } catch (e) {
          if (!(e instanceof ApiError && e.status === 404)) throw e
        }
      }
    } catch {
      outcome.suggestion = null
    }

    return outcome
  },

  async createFollowup(input: FollowupInput): Promise<Followup> {
    const data = await http.post('/followups', {
      lead_id: Number(input.leadId),
      kind: input.kind,
      title: input.title,
      due_at: input.dueAt,
      priority: input.priority,
      note: input.note,
    })
    return mapFollowup(data as Record<string, unknown>)
  },

  async completeFollowup(id: string) {
    await http.post(`/followups/${id}/complete`)
  },

  async snoozeFollowup(id: string, dueAt: string) {
    await http.post(`/followups/${id}/snooze`, { due_at: dueAt })
  },

  async submitPayment(saleId: string, method: PaymentMethod, reference: string) {
    await http.post(`/sales/${saleId}/submit-payment`, { method, reference_number: reference }, newIdempotencyKey())
  },

  async forwardSaleForConfirmation(saleId: string) {
    await http.post(`/sales/${saleId}/forward-for-confirmation`, undefined, newIdempotencyKey())
  },

  async confirmSale(saleId: string) {
    await http.post(`/sales/${saleId}/confirm`, undefined, newIdempotencyKey())
  },

  async rejectSale(saleId: string, reason: string) {
    await http.post(`/sales/${saleId}/reject`, { reason })
  },

  async cancelSale(saleId: string) {
    await http.post(`/sales/${saleId}/cancel`)
  },

  async requestPayout(amount: number): Promise<{ ok: boolean; message?: string }> {
    try {
      await http.post('/wallet/payout-requests', { amount }, newIdempotencyKey())
      return { ok: true }
    } catch (e) {
      if (e instanceof ApiError) return { ok: false, message: e.message }
      throw e
    }
  },
}
