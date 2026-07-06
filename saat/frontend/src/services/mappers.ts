// Translates the Laravel API's JSON shape (snake_case fields, numeric ids)
// into the frontend domain types (camelCase, string ids) so the rest of the
// app never has to know the wire format changed.
import type {
  Commission,
  Followup,
  Lead,
  PayoutRequest,
  Sale,
  Wallet,
  WalletTransaction,
} from '@/types'
import type { Suggestion } from './logic'

export function id(value: string | number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

export function nullableId(value: string | number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value)
}

export function splitName(fullName: string | null | undefined): { firstName: string; lastName: string } {
  const parts = (fullName ?? '').trim().split(/\s+/)
  return { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
}

/** @internal loose shape helper — the backend envelope is trusted, not re-validated field by field */
type Dto = Record<string, any>

export function mapLead(dto: Dto): Lead {
  return {
    id: id(dto.id),
    firstName: dto.first_name ?? '',
    lastName: dto.last_name ?? '',
    phone: dto.phone ?? '',
    city: dto.city ?? '',
    source: dto.source ?? 'website',
    temperature: dto.temperature ?? 'warm',
    priority: (dto.priority ?? 2) as Lead['priority'],
    stage: dto.stage ?? 'new',
    product: dto.product?.name ?? '',
    budget: dto.budget ?? '',
    job: dto.job ?? '',
    experience: dto.experience ?? 'none',
    incomeGoal: dto.income_goal ?? '',
    interestReason: dto.interest_reason ?? '',
    bestCallTime: dto.best_call_time ?? '',
    lastCallAt: dto.last_call_at ?? null,
    callCount: dto.call_count ?? 0,
    lastNote: dto.last_note ?? '',
    conversionProbability: dto.conversion_probability ?? 0,
    painPoint: dto.pain_point ?? '',
    objection: dto.objection ?? null,
    nextFollowupAt: dto.next_followup_at ?? null,
    rating: dto.rating ?? 0,
    assignedAgentId: id(dto.assigned_agent_id),
    status: dto.status ?? undefined,
    ownerId: nullableId(dto.assigned_agent_id),
    lockedBy: nullableId(dto.locked_by),
    lockedUntil: dto.locked_until ?? null,
    returnedToPool: !!dto.returned_to_pool,
    doNotCall: !!dto.do_not_call,
    duplicateOfId: nullableId(dto.duplicate_of_id),
    productId: dto.product?.id !== undefined ? id(dto.product.id) : undefined,
    campaignId: dto.campaign_id !== undefined ? nullableId(dto.campaign_id) ?? undefined : undefined,
  }
}

export function mapFollowup(dto: Dto): Followup {
  return {
    id: id(dto.id),
    leadId: id(dto.lead_id ?? dto.lead?.id),
    agentId: id(dto.agent_id),
    kind: dto.kind ?? 'call',
    title: dto.title ?? '',
    dueAt: dto.due_at,
    status: dto.status ?? 'pending',
    priority: (dto.priority ?? 2) as Followup['priority'],
    note: dto.note ?? undefined,
    completedAt: dto.completed_at ?? null,
  }
}

export function mapSale(dto: Dto): Sale {
  return {
    id: id(dto.id),
    leadId: id(dto.lead_id ?? dto.lead?.id),
    agentId: id(dto.agent_id),
    teamId: id(dto.team_id),
    productId: id(dto.product_id ?? dto.product?.id),
    amount: Number(dto.amount ?? 0),
    status: dto.status ?? 'draft',
    paymentMethod: dto.payment_method ?? null,
    createdAt: dto.created_at,
    submittedAt: dto.submitted_at ?? null,
    confirmedAt: dto.confirmed_at ?? null,
    rejectedAt: dto.rejected_at ?? null,
    rejectionReason: dto.rejection_reason ?? null,
  }
}

export function mapCommission(dto: Dto): Commission {
  return {
    id: id(dto.id),
    saleId: id(dto.sale_id),
    agentId: id(dto.agent_id),
    productId: id(dto.product_id),
    leadId: id(dto.lead_id),
    saleAmount: Number(dto.sale_amount ?? 0),
    commissionRate: Number(dto.commission_rate ?? 0),
    commissionAmount: Number(dto.commission_amount ?? 0),
    status: dto.status ?? 'pending',
    availableAt: dto.available_at ?? null,
    approvedAt: dto.approved_at ?? null,
    rejectionReason: dto.rejection_reason ?? null,
    createdAt: dto.created_at,
  }
}

export function mapWallet(dto: Dto): Wallet {
  return {
    balanceAvailable: Number(dto.balance_available ?? 0),
    balancePending: Number(dto.balance_pending ?? 0),
    balanceLocked: Number(dto.balance_locked ?? 0),
    totalEarned: Number(dto.total_earned ?? 0),
    totalPaid: Number(dto.total_paid ?? 0),
  }
}

export function mapWalletTransaction(dto: Dto): WalletTransaction {
  return {
    id: id(dto.id),
    type: dto.type,
    amount: Number(dto.amount ?? 0),
    description: dto.description ?? '',
    referenceType: dto.reference_type ?? null,
    referenceId: nullableId(dto.reference_id),
    createdAt: dto.created_at,
  }
}

export function mapPayoutRequest(dto: Dto): PayoutRequest {
  return {
    id: id(dto.id),
    agentId: id(dto.user_id),
    amount: Number(dto.amount ?? 0),
    status: dto.status ?? 'requested',
    requestedAt: dto.requested_at,
    processedAt: dto.processed_at ?? null,
    rejectionReason: dto.rejection_reason ?? null,
  }
}

export function mapSuggestion(dto: Dto | null | undefined): Suggestion | null {
  if (!dto || !dto.lead) return null
  return {
    lead: mapLead(dto.lead),
    reason: dto.reason,
    score: 0,
  }
}
