// Mock implementation of the ApiClient contract. It delegates to the Zustand
// store (the local, localStorage-backed source of truth) and simulates the
// async shape of a real network call. Swapping to the backend later means
// providing an `httpClient.ts` with the same interface and flipping
// `services/index.ts` — no screen changes required.
import { useStore } from '@/store/useStore'
import type {
  ApiClient,
  CallResultInput,
  CallResultOutcome,
  FollowupInput,
} from './client'
import type { Availability, Followup, PaymentMethod } from '@/types'
import { getSuggestion } from '@/lib/leadUtils'
import type { Suggestion } from './logic'

// small artificial latency so loading / optimistic states are exercised
function delay<T>(value: T, ms = 120): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

export const mockClient: ApiClient = {
  startShift: (availability: Availability = 'available') =>
    delay(useStore.getState().startShift(availability)),
  endShift: () => delay(useStore.getState().endShift()),
  setAvailability: (status: Availability) => delay(useStore.getState().setAvailability(status)),

  getNextLead: (): Promise<Suggestion | null> => {
    const { leads, followups, currentAgentId } = useStore.getState()
    return delay(getSuggestion(leads, followups, currentAgentId))
  },
  lockLead: (leadId: string) => delay(useStore.getState().lockLead(leadId)),
  releaseLead: (leadId: string) => delay(useStore.getState().releaseLead(leadId)),
  returnLeadToPool: (leadId: string) => delay(useStore.getState().returnLeadToPool(leadId)),
  reclaimLead: (leadId: string) => delay(useStore.getState().reclaimLead(leadId)),

  startCall: (leadId: string) => delay(useStore.getState().startCall(leadId)),
  submitCallResult: (input: CallResultInput): Promise<CallResultOutcome> =>
    delay(useStore.getState().submitCallResult(input)),

  createFollowup: (input: FollowupInput): Promise<Followup> =>
    delay(useStore.getState().createFollowup(input)),
  completeFollowup: (id: string) => delay(useStore.getState().completeFollowup(id)),
  snoozeFollowup: (id: string, dueAt: string) => delay(useStore.getState().snoozeFollowup(id, dueAt)),

  submitPayment: (saleId: string, method: PaymentMethod, reference: string) =>
    delay(useStore.getState().submitPayment(saleId, method, reference)),
  confirmSale: (saleId: string) => delay(useStore.getState().confirmSale(saleId)),
  rejectSale: (saleId: string, reason: string) => delay(useStore.getState().rejectSale(saleId, reason)),
  cancelSale: (saleId: string) => delay(useStore.getState().cancelSale(saleId)),

  requestPayout: (amount: number) => delay(useStore.getState().requestPayout(amount)),
}
