import type { Followup, Lead } from '@/types'
import { isToday, isOverdue } from './format'
import { rankSuggestions, isCallable, type Suggestion } from '@/services/logic'

// Can this agent call the lead right now? (not locked by someone else, not
// returned to the pool waiting for reclaim, and generally callable.)
export function canCallLead(lead: Lead, myAgentId: string): boolean {
  if (lead.returnedToPool) return false
  if (lead.lockedBy && lead.lockedBy !== myAgentId) return false
  return isCallable(lead)
}

// Backward-compatible helpers that now delegate to the smart suggestion engine.
export function getNextLead(leads: Lead[], followups: Followup[] = []): Lead | null {
  return rankSuggestions(leads, followups)[0]?.lead ?? null
}

export function getNextLeadAfter(
  leads: Lead[],
  excludeId: string,
  followups: Followup[] = [],
): Lead | null {
  return rankSuggestions(
    leads.filter((l) => l.id !== excludeId),
    followups,
  )[0]?.lead ?? null
}

export function getSuggestion(leads: Lead[], followups: Followup[]): Suggestion | null {
  return rankSuggestions(leads, followups)[0] ?? null
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
