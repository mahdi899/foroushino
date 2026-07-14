import { toJalali } from '@/lib/format'
import {
  calcDailyBreakSeconds,
  calcDailyCallSeconds,
  calcDailyProductiveSeconds,
  todayDateKey,
} from '@/lib/shiftUtils'
import type { Availability, WorkDaySummary, WorkSession } from '@/types'

export type WorkPeriod = 'daily' | 'weekly' | '10d' | '30d' | 'seasonal' | 'annual'

export const WORK_PERIODS: WorkPeriod[] = ['daily', 'weekly', '10d', '30d', 'seasonal', 'annual']

export const WORK_PERIOD_LABELS: Record<WorkPeriod, string> = {
  daily: 'روزانه',
  weekly: 'هفتگی',
  '10d': '۱۰ روزه',
  '30d': '۳۰ روزه',
  seasonal: 'فصلی',
  annual: 'سالانه',
}

export interface WorkPeriodTotals {
  workDays: number
  sessionsCount: number
  totalProductiveSeconds: number
  totalBreakSeconds: number
  totalCallSeconds: number
}

function jalaliSeason(jm: number): number {
  if (jm <= 3) return 1
  if (jm <= 6) return 2
  if (jm <= 9) return 3
  return 4
}

function parseDayDate(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

function daysBetweenInclusive(startKey: string, endKey: string): number {
  const start = parseDayDate(startKey).getTime()
  const end = parseDayDate(endKey).getTime()
  return Math.floor((end - start) / 86400000) + 1
}

export function isDayInWorkPeriod(date: string, period: WorkPeriod, now = new Date()): boolean {
  const today = todayDateKey(now)

  switch (period) {
    case 'daily':
      return date === today
    case 'weekly': {
      const since = new Date(now)
      since.setUTCDate(since.getUTCDate() - 6)
      return date >= todayDateKey(since) && date <= today
    }
    case '10d': {
      const since = new Date(now)
      since.setUTCDate(since.getUTCDate() - 9)
      return date >= todayDateKey(since) && date <= today
    }
    case '30d': {
      const since = new Date(now)
      since.setUTCDate(since.getUTCDate() - 29)
      return date >= todayDateKey(since) && date <= today
    }
    case 'seasonal': {
      const dayJ = toJalali(parseDayDate(date))
      const nowJ = toJalali(now)
      return dayJ.jy === nowJ.jy && jalaliSeason(dayJ.jm) === jalaliSeason(nowJ.jm)
    }
    case 'annual': {
      const dayJ = toJalali(parseDayDate(date))
      const nowJ = toJalali(now)
      return dayJ.jy === nowJ.jy
    }
    default:
      return false
  }
}

export function aggregateWorkPeriod(
  workDaySummaries: WorkDaySummary[],
  period: WorkPeriod,
  live: {
    workSession: WorkSession | null
    availability: Availability
    availabilityChangedAt: string | null
    nowMs: number
  },
): WorkPeriodTotals {
  const today = todayDateKey(new Date(live.nowMs))
  const dailyProductive = calcDailyProductiveSeconds(
    workDaySummaries,
    live.workSession,
    live.availability,
    live.availabilityChangedAt,
    live.nowMs,
  )
  const dailyBreak = calcDailyBreakSeconds(
    workDaySummaries,
    live.workSession,
    live.availability,
    live.availabilityChangedAt,
    live.nowMs,
  )
  const dailyCall = calcDailyCallSeconds(workDaySummaries, live.workSession, live.nowMs)

  const filtered = workDaySummaries.filter(
    (day) => day.sessionsCount > 0 && isDayInWorkPeriod(day.date, period, new Date(live.nowMs)),
  )

  let totalProductiveSeconds = filtered.reduce((sum, day) => sum + day.totalProductiveSeconds, 0)
  let totalBreakSeconds = filtered.reduce((sum, day) => sum + day.totalBreakSeconds, 0)
  let totalCallSeconds = filtered.reduce((sum, day) => sum + day.totalCallSeconds, 0)

  const todayInPeriod = isDayInWorkPeriod(today, period, new Date(live.nowMs))
  const todaySummary = workDaySummaries.find((day) => day.date === today)

  if (todayInPeriod && todaySummary) {
    totalProductiveSeconds += dailyProductive - todaySummary.totalProductiveSeconds
    totalBreakSeconds += dailyBreak - todaySummary.totalBreakSeconds
    totalCallSeconds += dailyCall - todaySummary.totalCallSeconds
  } else if (todayInPeriod) {
    totalProductiveSeconds += dailyProductive
    totalBreakSeconds += dailyBreak
    totalCallSeconds += dailyCall
  }

  return {
    workDays: filtered.length + (todayInPeriod && !todaySummary ? 1 : 0),
    sessionsCount: filtered.reduce((sum, day) => sum + day.sessionsCount, 0),
    totalProductiveSeconds: Math.max(0, totalProductiveSeconds),
    totalBreakSeconds: Math.max(0, totalBreakSeconds),
    totalCallSeconds: Math.max(0, totalCallSeconds),
  }
}

export function workPeriodSpanDays(period: WorkPeriod, now = new Date()): number {
  const today = todayDateKey(now)

  switch (period) {
    case 'daily':
      return 1
    case 'weekly':
      return 7
    case '10d':
      return 10
    case '30d':
      return 30
    case 'seasonal': {
      const month = now.getUTCMonth()
      const seasonStartMonth = Math.floor(month / 3) * 3
      const seasonStart = new Date(Date.UTC(now.getUTCFullYear(), seasonStartMonth, 1))
      return daysBetweenInclusive(todayDateKey(seasonStart), today)
    }
    case 'annual':
      return daysBetweenInclusive(todayDateKey(new Date(Date.UTC(now.getUTCFullYear(), 0, 1))), today)
    default:
      return 1
  }
}
