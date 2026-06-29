const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
}

export function toEn(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 11) {
    return toFa(`${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`)
  }
  return toFa(phone)
}

export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return toFa(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
}

const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه']
const FA_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

// Lightweight Jalali conversion (Gregorian -> Jalali)
export function toJalali(date: Date): { jy: number; jm: number; jd: number } {
  const gy = date.getFullYear()
  const gm = date.getMonth() + 1
  const gd = date.getDate()
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
  let jy = gy <= 1600 ? 0 : 979
  let gy2 = gy <= 1600 ? gy - 621 : gy - 1600
  const gy3 = gm > 2 ? gy2 + 1 : gy2
  let days =
    365 * gy2 +
    Math.floor((gy3 + 3) / 4) -
    Math.floor((gy3 + 99) / 100) +
    Math.floor((gy3 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1]
  jy += 33 * Math.floor(days / 12053)
  days %= 12053
  jy += 4 * Math.floor(days / 1461)
  days %= 1461
  if (days > 365) {
    jy += Math.floor((days - 1) / 365)
    days = (days - 1) % 365
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30)
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30)
  return { jy, jm, jd }
}

export function formatJalaliDate(date: Date, withWeekday = false): string {
  const { jy, jm, jd } = toJalali(date)
  const base = `${toFa(jd)} ${FA_MONTHS[jm - 1]} ${toFa(jy)}`
  if (withWeekday) {
    return `${WEEKDAYS[date.getDay()]}، ${base}`
  }
  return base
}

export function formatJalaliShort(date: Date): string {
  const { jm, jd } = toJalali(date)
  return `${toFa(jd)} ${FA_MONTHS[jm - 1]}`
}

export function formatTime(date: Date): string {
  return toFa(
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  )
}

export function relativeDay(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.round((startOf(date) - startOf(now)) / 86400000)
  if (diffDays === 0) return 'امروز'
  if (diffDays === 1) return 'فردا'
  if (diffDays === -1) return 'دیروز'
  if (diffDays > 1 && diffDays < 7) return `${toFa(diffDays)} روز دیگر`
  if (diffDays < 0) return `${toFa(Math.abs(diffDays))} روز پیش`
  return formatJalaliShort(date)
}

export function relativeDayTime(iso: string): string {
  const date = new Date(iso)
  return `${relativeDay(iso)}، ${formatTime(date)}`
}

export function isToday(iso: string): boolean {
  const d = new Date(iso)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`
}
