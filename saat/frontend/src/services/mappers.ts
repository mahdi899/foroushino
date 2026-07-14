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
  WorkDaySummary,
  WorkSession,
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
    displayCode: dto.display_code ?? undefined,
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
    assignedAgentName: (dto.assigned_agent_name as string | null | undefined) ?? null,
    assignedTeamId: nullableId(dto.assigned_team_id),
    status: dto.status ?? undefined,
    ownerId: nullableId(dto.assigned_agent_id),
    lockedBy: nullableId(dto.locked_by),
    lockedUntil: dto.locked_until ?? null,
    returnedToPool: !!dto.returned_to_pool,
    doNotCall: !!dto.do_not_call,
    duplicateOfId: nullableId(dto.duplicate_of_id),
    productId: dto.product?.id !== undefined ? id(dto.product.id) : undefined,
    campaignId: dto.campaign_id !== undefined ? nullableId(dto.campaign_id) ?? undefined : undefined,
    statusHistory: Array.isArray(dto.status_histories)
      ? dto.status_histories.map(mapLeadStatusHistory)
      : undefined,
  }
}

export function mapLeadStatusHistory(dto: Dto): import('@/types').LeadStatusEvent {
  return {
    id: id(dto.id),
    status: dto.status,
    at: dto.created_at ?? new Date().toISOString(),
    byAgentId: id(dto.by_user_id),
    note: dto.note ?? undefined,
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
  const embeddedLead = dto.lead as Dto | undefined
  const embeddedProduct = dto.product as Dto | undefined

  return {
    id: id(dto.id),
    leadId: id(dto.lead_id ?? embeddedLead?.id),
    agentId: id(dto.agent_id),
    teamId: id(dto.team_id),
    productId: id(dto.product_id ?? embeddedProduct?.id),
    amount: Number(dto.amount ?? 0),
    status: dto.status ?? 'draft',
    paymentMethod: dto.payment_method ?? null,
    createdAt: dto.created_at,
    submittedAt: dto.submitted_at ?? null,
    confirmedAt: dto.confirmed_at ?? null,
    rejectedAt: dto.rejected_at ?? null,
    rejectionReason: dto.rejection_reason ?? null,
    leadName: typeof embeddedLead?.full_name === 'string' ? embeddedLead.full_name : null,
    productName: typeof embeddedProduct?.name === 'string' ? embeddedProduct.name : null,
  }
}

/** Minimal lead row from SaleResource embed — for cards when lead isn't in /leads sync. */
export function mapLeadFromSaleEmbed(dto: Dto): Lead | null {
  if (dto.id == null) return null

  const { firstName, lastName } = splitName(dto.full_name)

  return {
    id: id(dto.id),
    firstName,
    lastName,
    phone: dto.phone ?? '',
    city: '',
    source: 'website',
    temperature: 'warm',
    priority: 2,
    stage: 'new',
    product: '',
    budget: '',
    job: '',
    experience: 'none',
    incomeGoal: '',
    interestReason: '',
    bestCallTime: '',
    lastCallAt: null,
    callCount: 0,
    lastNote: '',
    conversionProbability: 0,
    painPoint: '',
    objection: null,
    nextFollowupAt: null,
    rating: 0,
    assignedAgentId: '',
    assignedTeamId: null,
    ownerId: null,
    lockedBy: null,
    lockedUntil: null,
    returnedToPool: false,
    doNotCall: false,
    duplicateOfId: null,
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
  const amount = Number(dto.amount ?? 0)
  const bankFee = Number(dto.bank_fee ?? 0)
  return {
    id: id(dto.id),
    agentId: id(dto.user_id),
    amount,
    bankFee: bankFee || undefined,
    netAmount: dto.net_amount != null ? Number(dto.net_amount) : bankFee > 0 ? amount - bankFee : undefined,
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

export function mapWorkSession(dto: Dto | null | undefined): WorkSession | null {
  if (!dto) return null

  return {
    id: dto.id != null ? id(dto.id) : undefined,
    startedAt: dto.started_at ?? null,
    endedAt: dto.ended_at ?? null,
    totalBreakSeconds: Number(dto.total_break_seconds ?? 0),
    totalCallSeconds: Number(dto.total_call_seconds ?? 0),
    totalProductiveSeconds: Number(dto.total_productive_seconds ?? 0),
  }
}

export function mapWorkDaySummary(dto: Dto): WorkDaySummary {
  return {
    date: dto.date,
    sessionsCount: Number(dto.sessions_count ?? 0),
    totalProductiveSeconds: Number(dto.total_productive_seconds ?? 0),
    totalBreakSeconds: Number(dto.total_break_seconds ?? 0),
    totalCallSeconds: Number(dto.total_call_seconds ?? 0),
    firstStartedAt: dto.first_started_at ?? null,
    lastEndedAt: dto.last_ended_at ?? null,
    isOpen: !!dto.is_open,
  }
}

export function mapCall(dto: Dto): import('@/types').Call {
  return {
    id: id(dto.id),
    leadId: id(dto.lead_id),
    agentId: id(dto.agent_id),
    result: dto.result ?? 'no_answer',
    note: dto.note ?? '',
    durationSec: Number(dto.duration_sec ?? 0),
    objection: dto.objection ?? null,
    nextStage: dto.next_stage ?? null,
    createdAt: dto.started_at ?? dto.created_at ?? new Date().toISOString(),
  }
}

export function mapActivity(dto: Dto): import('@/types').ActivityLog {
  return {
    id: id(dto.id),
    agentId: id(dto.user_id),
    kind: dto.kind ?? 'system',
    title: dto.title ?? '',
    meta: dto.meta ?? undefined,
    createdAt: dto.created_at ?? new Date().toISOString(),
  }
}

export function mapAgentFromAdmin(dto: Dto): import('@/types').Agent {
  const { firstName, lastName } = splitName(dto.name as string)
  const roles = (dto.roles as string[]) ?? []
  const role = roles.includes('leader')
    ? 'leader'
    : roles.includes('supervisor')
      ? 'supervisor'
      : roles.includes('manager') || roles.includes('admin')
        ? 'manager'
        : 'agent'

  return {
    id: id(dto.id),
    firstName,
    lastName,
    role: role as import('@/types').Agent['role'],
    teamId: id(dto.team_id),
    avatar: dto.avatar ?? null,
    phone: dto.phone ?? dto.email ?? '',
    level: Number(dto.level ?? 1),
    callsToday: 0,
    successfulToday: 0,
    conversionRate: 0,
    points: Number(dto.points ?? 0),
    streak: Number(dto.streak ?? 0),
    callGoal: Number(dto.call_goal ?? 0),
  }
}

export function mapTeamFromAdmin(dto: Dto, memberIds: string[] = []): import('@/types').Team {
  return {
    id: id(dto.id),
    name: dto.name ?? '',
    leaderId: id(dto.leader_id),
    agentIds: memberIds,
  }
}

export function mapTeamReport(dto: Dto): import('@/types').TeamReport {
  return {
    id: id(dto.id),
    teamId: id(dto.team_id),
    teamName: dto.team_name ?? dto.team?.name ?? '',
    reportDate: dto.report_date ?? '',
    status: dto.status ?? 'submitted',
    summary: dto.summary ?? {
      calls_today: 0,
      successful_today: 0,
      conversion_rate: 0,
      pending_confirmation: 0,
      payment_submitted: 0,
      active_agents: 0,
    },
    leaderNotes: dto.leader_notes ?? null,
    supervisorNotes: dto.supervisor_notes ?? null,
    submittedBy: id(dto.submitted_by),
    submitterName: dto.submitter_name ?? undefined,
    approvedAt: dto.approved_at ?? null,
    forwardedAt: dto.forwarded_at ?? null,
    createdAt: dto.created_at ?? new Date().toISOString(),
  }
}

export function mapAgentReport(dto: Dto): import('@/types').AgentReport {
  return {
    id: id(dto.id),
    agentId: id(dto.agent_id),
    agentName: dto.agent_name ?? undefined,
    teamId: id(dto.team_id),
    teamName: dto.team_name ?? undefined,
    reportDate: dto.report_date ?? '',
    status: dto.status ?? 'submitted',
    summary: dto.summary ?? {
      calls_today: 0,
      successful_today: 0,
      conversion_rate: 0,
      followups_completed: 0,
      sales_submitted: 0,
    },
    agentNotes: dto.agent_notes ?? null,
    leaderNotes: dto.leader_notes ?? null,
    approvedAt: dto.approved_at ?? null,
    rejectedAt: dto.rejected_at ?? null,
    createdAt: dto.created_at ?? new Date().toISOString(),
  }
}
