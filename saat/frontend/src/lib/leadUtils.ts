import type { Followup, Lead, Temperature } from '@/types'
import { isToday, isOverdue } from './format'

const tempScore: Record<Temperature, number> = { hot: 3, warm: 2, cold: 1 }

// Pick the best "next call" lead: hottest, highest priority, soonest follow-up,
// not already won/lost.
export function getNextLead(leads: Lead[]): Lead | null {
  const candidates = leads.filter(
    (l) => l.stage !== 'won' && l.stage !== 'lost',
  )
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => {
    const score = (l: Lead) =>
      tempScore[l.temperature] * 100 +
      l.priority * 30 +
      l.conversionProbability
    return score(b) - score(a)
  })[0]
}

export function getNextLeadAfter(leads: Lead[], excludeId: string): Lead | null {
  return getNextLead(leads.filter((l) => l.id !== excludeId))
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
