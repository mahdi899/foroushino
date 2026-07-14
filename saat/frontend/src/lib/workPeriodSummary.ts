import { toJalali } from '@/lib/format'
import {
  calcDailyBreakSeconds,
  calcDailyCallSeconds,
  calcDailyProductiveSeconds,
  dateKeyFromIso,
  isShiftOpen,
  todayDateKey,
} from '@/lib/shiftUtils'
import type { Availability, Call, WorkDaySummary, WorkSession } from '@/types'

export type WorkPeriod = 'daily' | 'weekly' | '30d' | 'seasonal' | 'annual'

export const WORK_PERIODS: WorkPeriod[] = ['daily', 'weekly', '30d', 'seasonal', 'annual']

export const WORK_PERIOD_LABELS: Record<WorkPeriod, string> = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  '30d': '۳۰ روزه',
  seasonal: 'فصلی',
  annual: 'سالانه',
}

export interface WorkPeriodTotals {
  callsCount: number
  sessionsCount: number
  totalProductiveSeconds: number
  totalBreakSeconds: number
  totalCallSeconds: number
}

export interface WorkPeriodDayEntry {
  date: string
  label: string
  sublabel?: string
  productiveSeconds: number
  hasWork: boolean
}

const WEEKDAY_SHORT = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'] as const

function parseDayDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function listRollingDateKeys(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index
    return todayDateKey(addLocalDays(now, -offset))
  })
}

export function workPeriodSpanDays(period: WorkPeriod): number {
  switch (period) {
    case 'daily':
      return 1
    case 'weekly':
      return 7
    case '30d':
      return 30
    case 'seasonal':
      return 90
    case 'annual':
      return 365
    default:
      return 1
  }
}

export function isDayInWorkPeriod(date: string, period: WorkPeriod, now = new Date()): boolean {
  const today = todayDateKey(now)
  const span = workPeriodSpanDays(period)

  if (period === 'daily') {
    return date === today
  }

  const since = todayDateKey(addLocalDays(now, -(span - 1)))
  return date >= since && date <= today
}

type LiveShiftState = {
  workSession: WorkSession | null
  availability: Availability
  availabilityChangedAt: string | null
  nowMs: number
  calls?: Call[]
  agentId?: string
}

function sumCallSecondsForDate(calls: Call[] | undefined, agentId: string | undefined, date: string): number {
  if (!calls?.length || !agentId) return 0

  return calls
    .filter(
      (call) =>
        call.agentId === agentId &&
        dateKeyFromIso(call.createdAt) === date &&
        call.durationSec > 0,
    )
    .reduce((sum, call) => sum + call.durationSec, 0)
}

function countCallsForPeriod(
  calls: Call[] | undefined,
  agentId: string | undefined,
  dates: string[],
): number {
  if (!calls?.length || !agentId) return 0

  const dateSet = new Set(dates)
  return calls.filter(
    (call) => call.agentId === agentId && dateSet.has(dateKeyFromIso(call.createdAt)),
  ).length
}

function getDayProductiveSeconds(
  date: string,
  workDaySummaries: WorkDaySummary[],
  live: LiveShiftState,
): number {
  const today = todayDateKey(new Date(live.nowMs))
  if (date === today) {
    return calcDailyProductiveSeconds(
      workDaySummaries,
      live.workSession,
      live.availability,
      live.availabilityChangedAt,
      live.nowMs,
    )
  }

  return workDaySummaries.find((day) => day.date === date)?.totalProductiveSeconds ?? 0
}

function getDayBreakSeconds(
  date: string,
  workDaySummaries: WorkDaySummary[],
  live: LiveShiftState,
): number {
  const today = todayDateKey(new Date(live.nowMs))
  if (date === today) {
    return calcDailyBreakSeconds(
      workDaySummaries,
      live.workSession,
      live.availability,
      live.availabilityChangedAt,
      live.nowMs,
    )
  }

  return workDaySummaries.find((day) => day.date === date)?.totalBreakSeconds ?? 0
}

function getDayCallSeconds(
  date: string,
  workDaySummaries: WorkDaySummary[],
  live: LiveShiftState,
): number {
  const today = todayDateKey(new Date(live.nowMs))
  const fromCalls = sumCallSecondsForDate(live.calls, live.agentId, date)

  if (date === today) {
    const fromSession = calcDailyCallSeconds(
      workDaySummaries,
      live.workSession,
      live.availability,
      live.availabilityChangedAt,
      live.nowMs,
    )

    return Math.max(fromSession, fromCalls)
  }

  const fromSummary = workDaySummaries.find((day) => day.date === date)?.totalCallSeconds ?? 0
  return Math.max(fromSummary, fromCalls)
}

export function getWorkPeriodDayEntries(
  workDaySummaries: WorkDaySummary[],
  period: WorkPeriod,
  live: LiveShiftState,
): WorkPeriodDayEntry[] {
  if (period !== 'weekly' && period !== '30d') return []

  const now = new Date(live.nowMs)
  const dates = listRollingDateKeys(now, workPeriodSpanDays(period))

  return dates.map((date) => {
    const productiveSeconds = getDayProductiveSeconds(date, workDaySummaries, live)
    const dayDate = parseDayDate(date)
    const { jd } = toJalali(dayDate)

    if (period === 'weekly') {
      return {
        date,
        label: WEEKDAY_SHORT[dayDate.getUTCDay()],
        productiveSeconds,
        hasWork: productiveSeconds > 0,
      }
    }

    return {
      date,
      label: String(jd),
      sublabel: period === '30d' && date === todayDateKey(now) ? 'امروز' : undefined,
      productiveSeconds,
      hasWork: productiveSeconds > 0,
    }
  })
}

export function aggregateWorkPeriod(
  workDaySummaries: WorkDaySummary[],
  period: WorkPeriod,
  live: LiveShiftState,
): WorkPeriodTotals {
  const now = new Date(live.nowMs)
  const dates = listRollingDateKeys(now, workPeriodSpanDays(period))

  let totalProductiveSeconds = 0
  let totalBreakSeconds = 0
  let totalCallSeconds = 0
  let sessionsCount = 0

  for (const date of dates) {
    const productiveSeconds = getDayProductiveSeconds(date, workDaySummaries, live)
    const breakSeconds = getDayBreakSeconds(date, workDaySummaries, live)
    const callSeconds = getDayCallSeconds(date, workDaySummaries, live)
    const summary = workDaySummaries.find((day) => day.date === date)
    const isToday = date === todayDateKey(now)

    totalProductiveSeconds += productiveSeconds
    totalBreakSeconds += breakSeconds
    totalCallSeconds += callSeconds

    if (isToday && isShiftOpen(live.workSession)) {
      sessionsCount += Math.max(summary?.sessionsCount ?? 0, 1)
    } else {
      sessionsCount += summary?.sessionsCount ?? 0
    }
  }

  return {
    callsCount: countCallsForPeriod(live.calls, live.agentId, dates),
    sessionsCount,
    totalProductiveSeconds: Math.max(0, totalProductiveSeconds),
    totalBreakSeconds: Math.max(0, totalBreakSeconds),
    totalCallSeconds: Math.max(0, totalCallSeconds),
  }
}
