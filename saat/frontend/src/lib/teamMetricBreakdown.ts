import type { Agent, Followup, Lead } from '@/types'
import { conversionRateFromStats } from '@/lib/dailyGoal'
import { overdueFollowupsList } from '@/lib/reportUtils'
import { overdueFollowups } from '@/lib/leadUtils'
import { relativeDayTime, toFa } from '@/lib/format'

export type TeamMetricKind = 'calls' | 'conversion' | 'hot_leads' | 'overdue'

export type MetricDetailItem = {
  id: string
  leadId?: string
  title: string
  subtitle: string
}

export type AgentMetricBreakdown = {
  agentId: string
  agentName: string
  value: string
  items: MetricDetailItem[]
}

function agentName(agent: Agent): string {
  return `${agent.firstName} ${agent.lastName}`.trim() || 'کارشناس'
}

function leadName(lead: Lead): string {
  return `${lead.firstName} ${lead.lastName}`.trim() || 'مشتری'
}

export function buildCallsBreakdown(teamAgents: Agent[]): AgentMetricBreakdown[] {
  return teamAgents
    .map((agent) => ({
      agentId: agent.id,
      agentName: agentName(agent),
      value: toFa(agent.callsToday),
      items:
        agent.callsToday > 0
          ? [
              {
                id: `${agent.id}-calls`,
                title: `${toFa(agent.successfulToday)} تماس موفق از ${toFa(agent.callsToday)}`,
                subtitle: 'عملکرد امروز',
              },
            ]
          : [],
    }))
    .sort((a, b) => Number(b.value) - Number(a.value) || a.agentName.localeCompare(b.agentName, 'fa'))
}

export function buildConversionBreakdown(teamAgents: Agent[]): AgentMetricBreakdown[] {
  return teamAgents
    .map((agent) => {
      const rate = conversionRateFromStats(agent.callsToday, agent.successfulToday)
      return {
        agentId: agent.id,
        agentName: agentName(agent),
        value: `${toFa(rate)}٪`,
        items: [
          {
            id: `${agent.id}-conv`,
            title: `${toFa(agent.callsToday)} تماس · ${toFa(agent.successfulToday)} موفق`,
            subtitle: rate > 0 ? 'نرخ تبدیل امروز' : agent.callsToday > 0 ? 'هنوز تماس موفق ثبت نشده' : 'تماسی ثبت نشده',
          },
        ],
      }
    })
    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value) || a.agentName.localeCompare(b.agentName, 'fa'))
}

export function buildHotLeadsBreakdown(
  leads: Lead[],
  teamAgents: Agent[],
  teamAgentIds: string[],
): AgentMetricBreakdown[] {
  const buckets = new Map<string, MetricDetailItem[]>()

  for (const lead of leads) {
    if (lead.temperature !== 'hot' || !lead.assignedAgentId) continue
    if (!teamAgentIds.includes(lead.assignedAgentId)) continue

    const items = buckets.get(lead.assignedAgentId) ?? []
    items.push({
      id: lead.id,
      leadId: lead.id,
      title: leadName(lead),
      subtitle: [lead.product, lead.city].filter(Boolean).join(' · ') || 'لید داغ',
    })
    buckets.set(lead.assignedAgentId, items)
  }

  return teamAgents
    .map((agent) => {
      const items = buckets.get(agent.id) ?? []
      return {
        agentId: agent.id,
        agentName: agentName(agent),
        value: toFa(items.length),
        items,
      }
    })
    .filter((row) => row.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length)
}

export function buildOverdueBreakdown(
  followups: Followup[],
  leads: Lead[],
  teamAgents: Agent[],
  teamAgentIds: string[],
): AgentMetricBreakdown[] {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]))
  const overdue = overdueFollowupsList(followups).filter((row) => teamAgentIds.includes(row.agentId))
  const buckets = new Map<string, MetricDetailItem[]>()

  for (const followup of overdue) {
    const lead = leadById.get(followup.leadId)
    const items = buckets.get(followup.agentId) ?? []
    items.push({
      id: followup.id,
      leadId: followup.leadId,
      title: lead ? leadName(lead) : followup.title,
      subtitle: `${followup.title} · ${relativeDayTime(followup.dueAt)}`,
    })
    buckets.set(followup.agentId, items)
  }

  return teamAgents
    .map((agent) => {
      const items = buckets.get(agent.id) ?? []
      return {
        agentId: agent.id,
        agentName: agentName(agent),
        value: toFa(items.length),
        items,
      }
    })
    .filter((row) => row.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length)
}

export function metricSheetTitle(kind: TeamMetricKind, scope: 'team' | 'self' = 'team'): string {
  if (scope === 'self') {
    switch (kind) {
      case 'calls':
        return 'تماس‌های امروز من'
      case 'conversion':
        return 'نرخ تبدیل من'
      case 'hot_leads':
        return 'لیدهای داغ من'
      case 'overdue':
        return 'پیگیری‌های عقب‌افتاده من'
    }
  }

  switch (kind) {
    case 'calls':
      return 'تماس‌های امروز تیم'
    case 'conversion':
      return 'نرخ تبدیل کارشناسان'
    case 'hot_leads':
      return 'لیدهای داغ تیم'
    case 'overdue':
      return 'پیگیری‌های عقب‌افتاده'
  }
}

export function filterLeadsForTeam(leads: Lead[], teamAgentIds: string[]): Lead[] {
  return leads.filter((lead) => lead.assignedAgentId && teamAgentIds.includes(lead.assignedAgentId))
}

export function filterFollowupsForTeam(followups: Followup[], teamAgentIds: string[]): Followup[] {
  return followups.filter((row) => teamAgentIds.includes(row.agentId))
}

export function buildAgentSelfCallsItems(agent: Agent): MetricDetailItem[] {
  if (agent.callsToday <= 0) return []
  return [
    {
      id: `${agent.id}-calls`,
      title: `${toFa(agent.successfulToday)} تماس موفق از ${toFa(agent.callsToday)}`,
      subtitle: 'عملکرد امروز',
    },
  ]
}

export function buildAgentSelfConversionItems(agent: Agent): MetricDetailItem[] {
  const rate = conversionRateFromStats(agent.callsToday, agent.successfulToday)
  return [
    {
      id: `${agent.id}-conv`,
      title: `${toFa(agent.callsToday)} تماس · ${toFa(agent.successfulToday)} موفق`,
      subtitle:
        rate > 0
          ? `نرخ تبدیل ${toFa(rate)}٪`
          : agent.callsToday > 0
            ? 'هنوز تماس موفق ثبت نشده'
            : 'تماسی ثبت نشده',
    },
  ]
}

export function buildAgentSelfHotLeadItems(leads: Lead[]): MetricDetailItem[] {
  return leads
    .filter((lead) => lead.temperature === 'hot')
    .map((lead) => ({
      id: lead.id,
      leadId: lead.id,
      title: leadName(lead),
      subtitle: [lead.product, lead.city].filter(Boolean).join(' · ') || 'لید داغ',
    }))
}

export function buildAgentSelfOverdueItems(followups: Followup[], leads: Lead[]): MetricDetailItem[] {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]))
  return overdueFollowups(followups).map((followup) => {
    const lead = leadById.get(followup.leadId)
    return {
      id: followup.id,
      leadId: followup.leadId,
      title: lead ? leadName(lead) : followup.title,
      subtitle: `${followup.title} · ${relativeDayTime(followup.dueAt)}`,
    }
  })
}
