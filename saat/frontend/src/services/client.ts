// The swap-ready data contract. The mock client (localStorage-backed store)
// and the future httpClient both implement this interface, so switching the
// frontend to the real Laravel API is a one-file change in `index.ts`.
import type {
  Availability,
  CallResult,
  Followup,
  FollowupKind,
  Lead,
  Objection,
  PaymentMethod,
  Priority,
  SaleStage,
} from '@/types'
import type { Suggestion } from './logic'

export interface CallResultInput {
  leadId: string
  result: CallResult
  note: string
  objection: Objection | null
  nextStage: SaleStage | null
  rating: number
  followupAt: string | null
  followupKind?: FollowupKind
  durationSec: number
  saleAmount?: number
  idempotencyKey?: string
}

export interface FollowupInput {
  leadId: string
  kind: FollowupKind
  title: string
  dueAt: string
  priority: Priority
  note?: string
}

export interface CallResultOutcome {
  nextActionLabel: string
  createdSaleId: string | null
  createdFollowupId: string | null
  suggestion: Suggestion | null
}

// Domain contract. The store delegates its mutations here.
export interface ApiClient {
  // shift & availability (spec §1)
  startShift(availability?: Availability): Promise<void>
  endShift(): Promise<void>
  setAvailability(status: Availability): Promise<void>

  // leads (spec §2, §3)
  getNextLead(): Promise<Suggestion | null>
  lockLead(leadId: string): Promise<{ ok: boolean; lockedByOther?: boolean }>
  releaseLead(leadId: string): Promise<void>
  returnLeadToPool(leadId: string): Promise<void>
  reclaimLead(leadId: string): Promise<void>

  // calls & results (spec §5, §6)
  startCall(leadId: string): Promise<void>
  submitCallResult(input: CallResultInput): Promise<CallResultOutcome>

  // follow-ups (spec §7)
  createFollowup(input: FollowupInput): Promise<Followup>
  completeFollowup(id: string): Promise<void>
  snoozeFollowup(id: string, dueAt: string): Promise<void>

  // sales & payments (spec §8)
  submitPayment(saleId: string, method: PaymentMethod, reference: string): Promise<void>
  forwardSaleForConfirmation(saleId: string): Promise<void>
  confirmSale(saleId: string): Promise<void>
  rejectSale(saleId: string, reason: string): Promise<void>
  cancelSale(saleId: string): Promise<void>

  // wallet (spec §9)
  requestPayout(amount: number): Promise<{ ok: boolean; message?: string }>
}

export type { Lead }
