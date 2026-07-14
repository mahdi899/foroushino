import {
  leadStatusLabels,
  paymentMethodLabels,
  positiveResults,
  resultLabels,
  saleStatusLabels,
} from '@/data/labels'
import { saleCustomerName, saleProductName } from '@/lib/saleDisplay'
import { agentById } from '@/lib/teamUtils'
import type { LeadTimeline } from '@/services/leadTimeline'
import type { Agent, Call, Followup, Lead, Payment, Product, Sale, Team } from '@/types'

export interface SaleReviewAgentStat {
  agentId: string
  agentName: string
  teamName: string
  callsCount: number
  totalCallSeconds: number
  successfulCalls: number
}

export type SaleReviewTimelineKind = 'call' | 'status' | 'followup' | 'sale' | 'payment'

export interface SaleReviewTimelineItem {
  id: string
  at: string
  kind: SaleReviewTimelineKind
  title: string
  meta?: string
  note?: string
  agentName?: string
}

export interface SaleReviewDossier {
  customerName: string
  productName: string
  amount: number
  primaryAgentName: string
  primaryTeamName: string
  agentStats: SaleReviewAgentStat[]
  totalCallSeconds: number
  totalCalls: number
  followupsCount: number
  timeline: SaleReviewTimelineItem[]
}

function agentDisplayName(agents: Agent[], agentId: string, fallback = 'کارشناس'): string {
  const agent = agentById(agents, agentId)
  if (!agent) return fallback
  return `${agent.firstName} ${agent.lastName}`.trim()
}

function teamDisplayName(teams: Team[], teamId: string, agentId: string, agents: Agent[]): string {
  const team = teams.find((row) => row.id === teamId)
  if (team) return team.name
  const agent = agentById(agents, agentId)
  const fromAgentTeam = teams.find((row) => row.id === agent?.teamId)
  return fromAgentTeam?.name ?? '—'
}

function buildAgentStats(
  calls: Call[],
  agents: Agent[],
  teams: Team[],
): SaleReviewAgentStat[] {
  const byAgent = new Map<string, SaleReviewAgentStat>()

  for (const call of calls) {
    const existing = byAgent.get(call.agentId) ?? {
      agentId: call.agentId,
      agentName: agentDisplayName(agents, call.agentId),
      teamName: teamDisplayName(teams, '', call.agentId, agents),
      callsCount: 0,
      totalCallSeconds: 0,
      successfulCalls: 0,
    }
    existing.callsCount += 1
    existing.totalCallSeconds += call.durationSec
    if (positiveResults.includes(call.result)) {
      existing.successfulCalls += 1
    }
    const agent = agentById(agents, call.agentId)
    if (agent) {
      existing.teamName = teamDisplayName(teams, agent.teamId, call.agentId, agents)
    }
    byAgent.set(call.agentId, existing)
  }

  return [...byAgent.values()].sort((a, b) => b.totalCallSeconds - a.totalCallSeconds)
}

function buildTimelineItems(
  sale: Sale,
  timeline: LeadTimeline,
  payments: Payment[],
  agents: Agent[],
): SaleReviewTimelineItem[] {
  const items: SaleReviewTimelineItem[] = []

  for (const call of timeline.calls) {
    items.push({
      id: `call-${call.id}`,
      at: call.createdAt,
      kind: 'call',
      title: `تماس — ${resultLabels[call.result] ?? call.result}`,
      meta: call.durationSec > 0 ? `${Math.round(call.durationSec / 60)} دقیقه` : undefined,
      note: call.note || undefined,
      agentName: agentDisplayName(agents, call.agentId),
    })
  }

  for (const event of timeline.statusHistory) {
    items.push({
      id: `status-${event.id}`,
      at: event.at,
      kind: 'status',
      title: leadStatusLabels[event.status] ?? event.status,
      note: event.note,
      agentName: agentDisplayName(agents, event.byAgentId, 'سیستم'),
    })
  }

  for (const followup of timeline.followups) {
    items.push({
      id: `followup-${followup.id}`,
      at: followup.dueAt,
      kind: 'followup',
      title: `پیگیری — ${followup.title}`,
      meta: followup.status === 'done' ? 'انجام شد' : 'برنامه‌ریزی‌شده',
      agentName: agentDisplayName(agents, followup.agentId),
    })
  }

  for (const row of timeline.sales) {
    items.push({
      id: `sale-${row.id}`,
      at: row.submittedAt ?? row.createdAt,
      kind: 'sale',
      title: `فروش — ${saleStatusLabels[row.status] ?? row.status}`,
      meta: row.id === sale.id ? 'همین پرونده' : undefined,
      agentName: agentDisplayName(agents, row.agentId),
    })
  }

  const salePayments = payments.filter((payment) => payment.saleId === sale.id)
  for (const payment of salePayments) {
    items.push({
      id: `payment-${payment.id}`,
      at: payment.submittedAt,
      kind: 'payment',
      title: `ثبت پرداخت — ${paymentMethodLabels[payment.method]}`,
      meta: payment.referenceNumber ? `پیگیری: ${payment.referenceNumber}` : undefined,
    })
  }

  if (salePayments.length === 0 && sale.paymentMethod && sale.submittedAt) {
    items.push({
      id: `payment-sale-${sale.id}`,
      at: sale.submittedAt,
      kind: 'payment',
      title: `ثبت پرداخت — ${paymentMethodLabels[sale.paymentMethod]}`,
    })
  }

  return items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}

export function buildSaleReviewDossier(input: {
  sale: Sale
  lead?: Lead
  product?: Product
  agents: Agent[]
  teams: Team[]
  payments: Payment[]
  timeline: LeadTimeline
}): SaleReviewDossier {
  const { sale, lead, product, agents, teams, payments, timeline } = input
  const customerName = saleCustomerName(sale, lead) ?? 'مشتری'
  const productName = saleProductName(sale, product) ?? 'محصول'
  const primaryAgentName = agentDisplayName(agents, sale.agentId)
  const primaryTeamName = teamDisplayName(teams, sale.teamId, sale.agentId, agents)
  const agentStats = buildAgentStats(timeline.calls, agents, teams)

  if (!agentStats.some((row) => row.agentId === sale.agentId)) {
    agentStats.unshift({
      agentId: sale.agentId,
      agentName: primaryAgentName,
      teamName: primaryTeamName,
      callsCount: 0,
      totalCallSeconds: 0,
      successfulCalls: 0,
    })
  }

  const totalCallSeconds = timeline.calls.reduce((sum, call) => sum + call.durationSec, 0)

  return {
    customerName,
    productName,
    amount: sale.amount,
    primaryAgentName,
    primaryTeamName,
    agentStats,
    totalCallSeconds,
    totalCalls: timeline.calls.length,
    followupsCount: timeline.followups.length,
    timeline: buildTimelineItems(sale, timeline, payments, agents),
  }
}

export function buildTimelineFromStore(input: {
  leadId: string
  calls: Call[]
  followups: Followup[]
  sales: Sale[]
  lead?: Lead
}): LeadTimeline {
  return {
    calls: input.calls.filter((call) => call.leadId === input.leadId),
    followups: input.followups.filter((row) => row.leadId === input.leadId),
    statusHistory: input.lead?.statusHistory ?? [],
    sales: input.sales.filter((row) => row.leadId === input.leadId),
  }
}
