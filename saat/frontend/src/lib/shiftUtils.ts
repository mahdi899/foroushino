import type { Availability, WorkDaySummary, WorkSession } from '@/types'

export const PRODUCTIVE_AVAILABILITIES: Availability[] = ['available', 'in_call', 'doing_follow_up']

export function isProductiveAvailability(status: Availability): boolean {
  return PRODUCTIVE_AVAILABILITIES.includes(status)
}

export function isShiftOpen(session: WorkSession | null | undefined): boolean {
  return Boolean(session?.startedAt && !session?.endedAt)
}

export function calcLiveProductiveSeconds(
  session: WorkSession,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  let total = session.totalProductiveSeconds ?? 0

  if (isProductiveAvailability(availability) && availabilityChangedAt) {
    total += Math.max(0, Math.floor((nowMs - new Date(availabilityChangedAt).getTime()) / 1000))
  }

  return total
}

export function todayDateKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function rebaseOpenSessionDayMetric(
  summaryValue: number,
  workSession: WorkSession | null,
  storedSessionValue: number,
  liveValue: number,
): number {
  if (!workSession || !isShiftOpen(workSession)) return summaryValue
  return summaryValue - storedSessionValue + liveValue
}

export function calcDailyProductiveSeconds(
  workDaySummaries: WorkDaySummary[],
  workSession: WorkSession | null,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  const today = todayDateKey(new Date(nowMs))
  const summary = workDaySummaries.find((d) => d.date === today)
  const base = summary?.totalProductiveSeconds ?? 0

  if (!workSession || !isShiftOpen(workSession)) return base

  const stored = workSession.totalProductiveSeconds ?? 0
  const live = calcLiveProductiveSeconds(workSession, availability, availabilityChangedAt, nowMs)
  return rebaseOpenSessionDayMetric(base, workSession, stored, live)
}

export function calcDailyBreakSeconds(
  workDaySummaries: WorkDaySummary[],
  workSession: WorkSession | null,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  const today = todayDateKey(new Date(nowMs))
  const summary = workDaySummaries.find((d) => d.date === today)
  const base = summary?.totalBreakSeconds ?? 0

  if (!workSession || !isShiftOpen(workSession)) return base

  const stored = workSession.totalBreakSeconds ?? 0
  const live = calcLiveBreakSeconds(workSession, availability, availabilityChangedAt, nowMs)
  return rebaseOpenSessionDayMetric(base, workSession, stored, live)
}

export function calcDailyCallSeconds(
  workDaySummaries: WorkDaySummary[],
  workSession: WorkSession | null,
): number {
  const today = todayDateKey()
  const summary = workDaySummaries.find((d) => d.date === today)
  const base = summary?.totalCallSeconds ?? 0

  if (!workSession || !isShiftOpen(workSession)) return base

  const current = workSession.totalCallSeconds ?? 0
  return rebaseOpenSessionDayMetric(base, workSession, current, current)
}

export function calcLiveBreakSeconds(
  session: WorkSession,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  let total = session.totalBreakSeconds ?? 0

  if (
    availability !== 'offline' &&
    !isProductiveAvailability(availability) &&
    availabilityChangedAt
  ) {
    total += Math.max(0, Math.floor((nowMs - new Date(availabilityChangedAt).getTime()) / 1000))
  }

  return total
}
