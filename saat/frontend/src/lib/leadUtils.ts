import type { Agent, Followup, Lead } from '@/types'
import { isToday, isOverdue } from './format'
import { rankSuggestions, isCallable, type Suggestion } from '@/services/logic'

/** Leads locked by another agent must not appear in this agent's UI. */
export function isLeadVisibleToAgent(lead: Lead, myAgentId: string): boolean {
  if (lead.lockedBy && lead.lockedBy !== myAgentId) return false
  return true
}

export function filterLeadsForAgent(leads: Lead[], myAgentId: string): Lead[] {
  return leads.filter((l) => isLeadVisibleToAgent(l, myAgentId))
}

/** Display name for the agent a lead is assigned to (management views). */
export function assignedAgentLabel(lead: Lead, agents: Agent[]): string | null {
  const fromApi = lead.assignedAgentName?.trim()
  if (fromApi) return fromApi
  if (!lead.assignedAgentId) return null
  const agent = agents.find((a) => a.id === lead.assignedAgentId)
  if (!agent) return null
  const name = `${agent.firstName} ${agent.lastName}`.trim()
  return name || null
}

export function filterFollowupsForAgent(
  followups: Followup[],
  leads: Lead[],
  myAgentId: string,
): Followup[] {
  const visibleIds = new Set(filterLeadsForAgent(leads, myAgentId).map((l) => l.id))
  return followups.filter((f) => visibleIds.has(f.leadId))
}

// Can this agent call the lead right now? (not locked by someone else, not
// returned to the pool waiting for reclaim, and generally callable.)
export function canCallLead(lead: Lead, myAgentId: string): boolean {
  if (lead.returnedToPool) return false
  if (lead.lockedBy && lead.lockedBy !== myAgentId) return false
  return isCallable(lead)
}

// Backward-compatible helpers that now delegate to the smart suggestion engine.
export function getNextLead(leads: Lead[], followups: Followup[] = [], myAgentId: string): Lead | null {
  return rankSuggestions(filterLeadsForAgent(leads, myAgentId), followups)[0]?.lead ?? null
}

export function getNextLeadAfter(
  leads: Lead[],
  excludeId: string,
  followups: Followup[] = [],
  myAgentId: string,
): Lead | null {
  return rankSuggestions(
    filterLeadsForAgent(leads, myAgentId).filter((l) => l.id !== excludeId),
    followups,
  )[0]?.lead ?? null
}

export function getSuggestion(leads: Lead[], followups: Followup[], myAgentId: string): Suggestion | null {
  return rankSuggestions(filterLeadsForAgent(leads, myAgentId), followups)[0] ?? null
}

export function getSuggestionAfter(
  leads: Lead[],
  followups: Followup[],
  excludeId: string,
  myAgentId: string,
): Suggestion | null {
  return rankSuggestions(
    filterLeadsForAgent(leads, myAgentId).filter((l) => l.id !== excludeId),
    followups,
  )[0] ?? null
}

export function todayFollowups(followups: Followup[]): Followup[] {
  return followups
    .filter((f) => f.status !== 'done' && isToday(f.dueAt))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export function overdueFollowups(followups: Followup[]): Followup[] {
  return followups
    .filter((f) => f.status !== 'done' && !isToday(f.dueAt) && isOverdue(f.dueAt))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export function upcomingFollowups(followups: Followup[]): Followup[] {
  return followups
    .filter((f) => f.status !== 'done' && !isOverdue(f.dueAt) && !isToday(f.dueAt))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

function isTomorrow(iso: string): boolean {
  const d = new Date(iso)
  const t = new Date()
  t.setDate(t.getDate() + 1)
  return (
    d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()
  )
}

export function tomorrowFollowups(followups: Followup[]): Followup[] {
  return followups
    .filter((f) => f.status !== 'done' && f.status !== 'cancelled' && isTomorrow(f.dueAt))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export function thisWeekFollowups(followups: Followup[]): Followup[] {
  const in7d = Date.now() + 7 * 24 * 60 * 60 * 1000
  return followups
    .filter(
      (f) =>
        f.status !== 'done' &&
        f.status !== 'cancelled' &&
        !isOverdue(f.dueAt) &&
        new Date(f.dueAt).getTime() <= in7d,
    )
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export function criticalFollowups(followups: Followup[]): Followup[] {
  return followups
    .filter((f) => f.status !== 'done' && f.status !== 'cancelled' && f.priority === 3)
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export function doneFollowups(followups: Followup[]): Followup[] {
  return followups
    .filter((f) => f.status === 'done')
    .sort((a, b) => new Date(b.completedAt ?? b.dueAt).getTime() - new Date(a.completedAt ?? a.dueAt).getTime())
}

export interface TodaySummary {
  calls: number
  successful: number
  followups: number
  meetings: number
}

export function todaySummary(leads: Lead[], followups: Followup[]): TodaySummary {
  const calls = leads.filter((l) => l.lastCallAt && isToday(l.lastCallAt)).length
  return {
    calls,
    successful: leads.filter((l) => l.stage === 'won').length,
    followups: todayFollowups(followups).length,
    meetings: leads.filter((l) => l.stage === 'meeting').length,
  }
}
