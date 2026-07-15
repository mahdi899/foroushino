import type { Availability, WorkDaySummary, WorkSession } from '@/types'
import {
  dateKeyFromIso as businessDateKeyFromIso,
  todayDateKey as businessTodayDateKey,
} from '@/lib/businessDate'

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
  return businessTodayDateKey(now)
}

/** Iran calendar date for an ISO timestamp. */
export function dateKeyFromIso(iso: string): string {
  return businessDateKeyFromIso(iso)
}

export function isSessionOnDate(session: WorkSession, date: string): boolean {
  if (!session.startedAt) return false

  return todayDateKey(new Date(session.startedAt)) === date
}

export function calcSessionActiveSeconds(session: WorkSession, nowMs: number): number {
  if (!session.startedAt) return 0

  const startMs = new Date(session.startedAt).getTime()
  const endMs = session.endedAt ? new Date(session.endedAt).getTime() : nowMs

  return Math.max(0, Math.floor((endMs - startMs) / 1000))
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

  if (!summary) {
    return live
  }

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

  if (!summary) {
    return live
  }

  return rebaseOpenSessionDayMetric(base, workSession, stored, live)
}

export function calcLiveCallSeconds(
  session: WorkSession,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  let total = session.totalCallSeconds ?? 0

  if (availability === 'in_call' && availabilityChangedAt) {
    total += Math.max(0, Math.floor((nowMs - new Date(availabilityChangedAt).getTime()) / 1000))
  }

  return total
}

export function calcDailyCallSeconds(
  workDaySummaries: WorkDaySummary[],
  workSession: WorkSession | null,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  const today = todayDateKey(new Date(nowMs))
  const summary = workDaySummaries.find((d) => d.date === today)
  const base = summary?.totalCallSeconds ?? 0

  if (!workSession || !isShiftOpen(workSession)) {
    return base
  }

  const stored = workSession.totalCallSeconds ?? 0
  const live = calcLiveCallSeconds(workSession, availability, availabilityChangedAt, nowMs)

  if (!summary) {
    return live
  }

  return rebaseOpenSessionDayMetric(base, workSession, stored, live)
}

export function calcDailyActivitySeconds(
  workDaySummaries: WorkDaySummary[],
  workSession: WorkSession | null,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  return (
    calcDailyProductiveSeconds(
      workDaySummaries,
      workSession,
      availability,
      availabilityChangedAt,
      nowMs,
    ) +
    calcDailyBreakSeconds(
      workDaySummaries,
      workSession,
      availability,
      availabilityChangedAt,
      nowMs,
    )
  )
}

/** @deprecated Prefer calcDailyActivitySeconds — wall-clock shift time can diverge from tracked activity. */
export function calcDailyShiftSeconds(
  workDaySummaries: WorkDaySummary[],
  workSession: WorkSession | null,
  availability: Availability,
  availabilityChangedAt: string | null,
  nowMs: number,
): number {
  return calcDailyActivitySeconds(
    workDaySummaries,
    workSession,
    availability,
    availabilityChangedAt,
    nowMs,
  )
}

export function mergeClosedSessionIntoDaySummaries(
  workDaySummaries: WorkDaySummary[],
  session: WorkSession,
): WorkDaySummary[] {
  if (!session.startedAt || !session.endedAt) return workDaySummaries

  const date = todayDateKey(new Date(session.startedAt))
  const productive = session.totalProductiveSeconds ?? 0
  const breakSeconds = session.totalBreakSeconds ?? 0
  const callSeconds = session.totalCallSeconds ?? 0
  const existing = workDaySummaries.find((day) => day.date === date)

  if (existing) {
    return workDaySummaries.map((day) =>
      day.date === date
        ? {
            ...day,
            sessionsCount: day.sessionsCount + 1,
            totalProductiveSeconds: day.totalProductiveSeconds + productive,
            totalBreakSeconds: day.totalBreakSeconds + breakSeconds,
            totalCallSeconds: day.totalCallSeconds + callSeconds,
            lastEndedAt: session.endedAt,
            isOpen: false,
          }
        : day,
    )
  }

  return [
    {
      date,
      sessionsCount: 1,
      totalProductiveSeconds: productive,
      totalBreakSeconds: breakSeconds,
      totalCallSeconds: callSeconds,
      firstStartedAt: session.startedAt,
      lastEndedAt: session.endedAt,
      isOpen: false,
    },
    ...workDaySummaries,
  ]
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
