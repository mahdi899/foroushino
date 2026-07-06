// Real backend implementation of the `ApiClient` contract (Laravel «فروشینو»
// API). Implements the exact same interface as `mockClient.ts`, so flipping
// `services/index.ts` is the only change required anywhere else in the app.
import type { ApiClient, CallResultInput, CallResultOutcome, FollowupInput } from './client'
import type { Availability, Followup, NextAction, PaymentMethod } from '@/types'
import { nextActionLabels } from '@/data/labels'
import { ApiError, http, newIdempotencyKey } from './http'
import { mapFollowup, mapSuggestion } from './mappers'
import type { Suggestion } from './logic'

// The ApiClient contract identifies calls by `leadId`, but the backend's
// `/calls/{call}/result` endpoint is keyed by the call it started. We keep a
// small in-memory map from lead -> open call, populated by `startCall`.
const activeCallByLead = new Map<string, number>()

export const httpClient: ApiClient = {
  async startShift() {
    await http.post('/shift/start')
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

  async startCall(leadId: string) {
    const data = await http.post<{ call: { id: number | string } }>('/calls/start', {
      lead_id: Number(leadId),
    })
    activeCallByLead.set(leadId, Number(data.call.id))
  },

  async submitCallResult(input: CallResultInput): Promise<CallResultOutcome> {
    const callId = activeCallByLead.get(input.leadId)
    if (callId === undefined) {
      throw new Error('هیچ تماس فعالی برای این سرنخ یافت نشد. ابتدا تماس را شروع کن.')
    }

    const payload: Record<string, unknown> = {
      result: input.result,
      note: input.note || undefined,
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

    const idempotencyKey = input.idempotencyKey ?? newIdempotencyKey()
    const data = await http.post<{
      follow_up: unknown | null
      sale: { id: string | number } | null
      next_action: string
    }>(`/calls/${callId}/result`, payload, idempotencyKey)

    activeCallByLead.delete(input.leadId)

    let suggestion: Suggestion | null = null
    try {
      const next = await http.post<{ lead: unknown; reason: string }>('/leads/next')
      suggestion = mapSuggestion(next)
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) throw e
    }

    return {
      nextActionLabel: nextActionLabels[data.next_action as NextAction] ?? '',
      createdSaleId: data.sale ? String(data.sale.id) : null,
      createdFollowupId:
        data.follow_up && typeof data.follow_up === 'object' && 'id' in (data.follow_up as Record<string, unknown>)
          ? String((data.follow_up as Record<string, unknown>).id)
          : null,
      suggestion,
    }
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
