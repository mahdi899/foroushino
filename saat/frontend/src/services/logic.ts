// Pure, swap-ready business logic shared by the mock client and (later) the
// real API integration. No React / store imports here on purpose.
import type {
  CallResult,
  Commission,
  Followup,
  Lead,
  LeadStatus,
  NextAction,
  Product,
  Sale,
  SaleStage,
  SuggestReason,
} from '@/types'
import { isOverdue, isToday } from '@/lib/format'
import { resultToLeadStatus, resultToNextAction, resultToStage } from '@/data/labels'

let seq = 5000
export function uid(prefix: string): string {
  return `${prefix}-${++seq}-${Date.now().toString(36)}`
}

const tempScore: Record<Lead['temperature'], number> = { hot: 3, warm: 2, cold: 1 }

export function isCallable(lead: Lead): boolean {
  if (lead.doNotCall) return false
  if (lead.stage === 'won' || lead.stage === 'lost') return false
  const status = lead.status
  if (
    status === 'won' ||
    status === 'lost' ||
    status === 'do_not_call' ||
    status === 'duplicate' ||
    status === 'wrong_number'
  )
    return false
  return true
}

export interface Suggestion {
  lead: Lead
  reason: SuggestReason
  score: number
}

// Parse "بهترین زمان تماس" heuristically — hot lead whose follow-up is today.
function isInBestWindow(lead: Lead): boolean {
  if (!lead.nextFollowupAt) return false
  return isToday(lead.nextFollowupAt)
}

// Smart lead prioritisation (spec §3). Returns ranked suggestions with reason.
export function rankSuggestions(leads: Lead[], followups: Followup[]): Suggestion[] {
  const fuByLead = new Map<string, Followup>()
  for (const f of followups) {
    if (f.status === 'done' || f.status === 'cancelled') continue
    const existing = fuByLead.get(f.leadId)
    if (!existing || new Date(f.dueAt).getTime() < new Date(existing.dueAt).getTime()) {
      fuByLead.set(f.leadId, f)
    }
  }

  const suggestions: Suggestion[] = []
  for (const lead of leads) {
    if (!isCallable(lead)) continue
    const fu = fuByLead.get(lead.id)
    let reason: SuggestReason
    let base: number

    if (fu && isOverdue(fu.dueAt) && !isToday(fu.dueAt)) {
      reason = 'overdue_follow_up'
      base = 1000
    } else if (fu && isToday(fu.dueAt)) {
      reason = 'today_follow_up'
      base = 900
    } else if (lead.temperature === 'hot' && isInBestWindow(lead)) {
      reason = 'hot_in_window'
      base = 800
    } else if (
      (lead.stage === 'interested' || lead.temperature === 'hot') &&
      lead.callCount > 0
    ) {
      reason = 'interested_needs_follow_up'
      base = 700
    } else if (lead.callCount === 0 && lead.conversionProbability >= 50) {
      reason = 'fresh_high_prob'
      base = 600
    } else if (lead.temperature === 'warm') {
      reason = 'warm'
      base = 400
    } else {
      reason = 'cold'
      base = 200
    }

    const score =
      base +
      tempScore[lead.temperature] * 30 +
      lead.priority * 20 +
      lead.conversionProbability
    suggestions.push({ lead, reason, score })
  }

  return suggestions.sort((a, b) => b.score - a.score)
}

export function suggestNext(leads: Lead[], followups: Followup[]): Suggestion | null {
  const ranked = rankSuggestions(leads, followups)
  return ranked[0] ?? null
}

export function suggestNextAfter(
  leads: Lead[],
  followups: Followup[],
  excludeId: string,
): Suggestion | null {
  const ranked = rankSuggestions(
    leads.filter((l) => l.id !== excludeId),
    followups,
  )
  return ranked[0] ?? null
}

// ---------------------------------------------------------------------------
// Call-result routing (spec §6). Maps a result to systemic effects.
// ---------------------------------------------------------------------------

export interface RoutedResult {
  nextAction: NextAction
  status: LeadStatus
  stage: SaleStage | null
  createsFollowup: boolean
  createsSale: 'payment_pending' | 'pending_confirmation' | null
  removesFromCycle: boolean
}

export function routeCallResult(result: CallResult): RoutedResult {
  const nextAction = resultToNextAction[result]
  const status = resultToLeadStatus[result]
  const stage = resultToStage[result] ?? null

  return {
    nextAction,
    status,
    stage,
    createsFollowup:
      nextAction === 'create_follow_up' ||
      nextAction === 'schedule_consultation' ||
      nextAction === 'schedule_retry',
    createsSale:
      nextAction === 'create_payment_pending_sale'
        ? 'payment_pending'
        : nextAction === 'create_sale_pending_confirmation'
          ? 'pending_confirmation'
          : null,
    removesFromCycle: nextAction === 'mark_do_not_call',
  }
}

// ---------------------------------------------------------------------------
// Commission maths (spec §9). Decimal-safe (integer Toman).
// ---------------------------------------------------------------------------

export function computeCommission(product: Product | undefined, amount: number): number {
  const rate = product?.commissionRate ?? 15
  return Math.round((amount * rate) / 100)
}

export function newCommission(sale: Sale, product: Product | undefined): Commission {
  return {
    id: uid('com'),
    saleId: sale.id,
    agentId: sale.agentId,
    productId: sale.productId,
    leadId: sale.leadId,
    saleAmount: sale.amount,
    commissionRate: product?.commissionRate ?? 15,
    commissionAmount: computeCommission(product, sale.amount),
    status: 'pending',
    createdAt: new Date().toISOString(),
  }
}

// Derive a systemic LeadStatus from the legacy sale-stage, used to backfill
// seed data so both models stay consistent.
export function stageToStatus(lead: Lead): LeadStatus {
  if (lead.status) return lead.status
  switch (lead.stage) {
    case 'new':
      return lead.callCount > 0 ? 'contacted' : 'new'
    case 'first_call':
      return 'contacted'
    case 'interested':
      return 'follow_up_required'
    case 'follow_up':
      return lead.nextFollowupAt && isOverdue(lead.nextFollowupAt)
        ? 'follow_up_overdue'
        : 'follow_up_required'
    case 'meeting':
      return 'consultation_scheduled'
    case 'payment_pending':
      return 'payment_pending'
    case 'won':
      return 'won'
    case 'lost':
      return 'lost'
    default:
      return 'assigned'
  }
}
