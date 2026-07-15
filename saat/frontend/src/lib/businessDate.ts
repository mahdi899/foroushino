/** Business calendar — midnight boundaries follow Iran time (Asia/Tehran). */
export const BUSINESS_TIMEZONE = 'Asia/Tehran'

export const IRAN_OFFSET = '+03:30'

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

function toFaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
}

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIMEZONE,
  weekday: 'short',
})

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** YYYY-MM-DD in Iran — not the browser's local timezone. */
export function todayDateKey(now = new Date()): string {
  return dateKeyFormatter.format(now)
}

/** Iran calendar date for an ISO timestamp. */
export function dateKeyFromIso(iso: string): string {
  return todayDateKey(new Date(iso))
}

export function isBusinessToday(iso: string, now = new Date()): boolean {
  return dateKeyFromIso(iso) === todayDateKey(now)
}

export function businessDaysBetween(fromDateKey: string, toDateKey: string): number {
  const fromMs = new Date(`${fromDateKey}T12:00:00${IRAN_OFFSET}`).getTime()
  const toMs = new Date(`${toDateKey}T12:00:00${IRAN_OFFSET}`).getTime()
  return Math.round((toMs - fromMs) / 86_400_000)
}

/** Clock time (HH:mm) in Iran — independent of browser timezone. */
export function formatBusinessTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)
  const h = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const m = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return toFaDigits(`${h}:${m}`)
}

/** ISO instant for follow-up at {hour}:00 on today+dayOffset in Iran. */
export function buildBusinessFollowupIso(dayOffset: number, hour: number): string {
  const dateKey = addBusinessDays(todayDateKey(), dayOffset)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dateKey}T${pad(hour)}:00:00${IRAN_OFFSET}`
}

export function addBusinessDays(dateKey: string, days: number): string {
  const anchor = new Date(`${dateKey}T12:00:00${IRAN_OFFSET}`)
  return todayDateKey(new Date(anchor.getTime() + days * 86_400_000))
}

export function msUntilNextBusinessMidnight(now = new Date()): number {
  const tomorrow = addBusinessDays(todayDateKey(now), 1)
  const midnight = new Date(`${tomorrow}T00:00:00${IRAN_OFFSET}`)
  return Math.max(500, midnight.getTime() - now.getTime())
}

export function businessWeekdayIndex(dateKey: string): number {
  const anchor = new Date(`${dateKey}T12:00:00${IRAN_OFFSET}`)
  const short = weekdayFormatter.format(anchor)
  return WEEKDAY_INDEX[short] ?? 0
}
