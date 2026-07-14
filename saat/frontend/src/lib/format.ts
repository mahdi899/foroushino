import {
  businessDaysBetween,
  dateKeyFromIso,
  formatBusinessTime,
  isBusinessToday,
  todayDateKey,
} from '@/lib/businessDate'

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)])
}

export function toEn(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
}

export function maskPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length >= 7) {
    const start = clean.slice(0, 4)
    const end = clean.slice(-2)
    return toFa(`${start}***${end}`)
  }
  return toFa(phone)
}

export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '')
  if (clean.length === 11 && clean.startsWith('09')) {
    return toFa(`${clean.slice(0, 4)} · ${clean.slice(4, 7)} · ${clean.slice(7)}`)
  }
  if (clean.length === 10 && clean.startsWith('9')) {
    return toFa(`0${clean.slice(0, 3)} · ${clean.slice(3, 6)} · ${clean.slice(6)}`)
  }
  return toFa(phone)
}

export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return toFa(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
}

export function formatHms(totalSec: number): string {
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return toFa(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
  }
  return formatDuration(totalSec)
}

export function formatMoney(amount: number): string {
  return toFa(Math.round(amount).toLocaleString('en-US'))
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

/** Formats a `YYYY-MM-DD` (or ISO datetime) value for Persian UI. */
export function formatIsoDateJalali(iso: string, withWeekday = false): string {
  const date = new Date(iso.includes('T') ? iso : `${iso}T12:00:00`)
  if (Number.isNaN(date.getTime())) return toFa(iso)
  return formatJalaliDate(date, withWeekday)
}

export function formatTime(date: Date): string {
  return formatBusinessTime(date)
}

export function relativeDay(iso: string): string {
  const diffDays = businessDaysBetween(todayDateKey(), dateKeyFromIso(iso))
  if (diffDays === 0) return 'امروز'
  if (diffDays === 1) return 'فردا'
  if (diffDays === -1) return 'دیروز'
  if (diffDays > 1 && diffDays < 7) return `${toFa(diffDays)} روز دیگر`
  if (diffDays < 0) return `${toFa(Math.abs(diffDays))} روز پیش`
  return formatJalaliShort(new Date(iso))
}

export function relativeDayTime(iso: string): string {
  const date = new Date(iso)
  return `${relativeDay(iso)}، ${formatTime(date)}`
}

export function isToday(iso: string): boolean {
  return isBusinessToday(iso)
}

export function isOverdue(iso: string): boolean {
  return new Date(iso).getTime() < Date.now()
}

export function initials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`
}
