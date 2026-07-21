const FAMILY_TIME_ZONE = 'Asia/Tehran';

const persianDateFormatter = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: FAMILY_TIME_ZONE,
    ...options,
  });

const timeFormatter = new Intl.DateTimeFormat('fa-IR', {
  timeZone: FAMILY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const tehranDayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: FAMILY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function parseDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function tehranDayKey(d: Date): string {
  return tehranDayFormatter.format(d);
}

/** شیفت روز تقویمی تهران با کلید YYYY-MM-DD (مستقل از TZ مرورگر) */
function shiftTehranDayKey(dayKey: string, deltaDays: number): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  if (!y || !m || !d) return dayKey;
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function tehranTodayKey(): string {
  return tehranDayKey(new Date());
}

function tehranYesterdayKey(): string {
  return shiftTehranDayKey(tehranTodayKey(), -1);
}

function formatPersianTime(d: Date): string {
  return timeFormatter.format(d);
}

/** روز + ماه شمسی؛ سال فقط وقتی با امسال فرق داشته باشد */
function formatPersianPostDate(d: Date): string {
  const postYear = persianDateFormatter({ year: 'numeric' }).format(d);
  const currentYear = persianDateFormatter({ year: 'numeric' }).format(new Date());

  return persianDateFormatter({
    day: 'numeric',
    month: 'long',
    ...(postYear !== currentYear ? { year: 'numeric' } : {}),
  }).format(d);
}

/** کلید روز برای گروه‌بندی پست‌ها (تقویم میلادی در منطقه تهران) */
export function getPostDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = parseDate(iso);
  return d ? tehranDayKey(d) : null;
}

/** برچسب جداکننده روز — امروز، دیروز، یا تاریخ شمسی */
export function formatFeedDaySeparator(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;

  const key = tehranDayKey(d);
  if (key === tehranTodayKey()) return 'امروز';
  if (key === tehranYesterdayKey()) return 'دیروز';

  return persianDateFormatter({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

/**
 * تاریخ و ساعت زیر هر پست — همیشه به وقت ایران (Asia/Tehran)
 * و همیشه شامل تاریخ شمسی + ساعت.
 */
export function formatPostDateTime(iso: string | null | undefined): string {
  if (!iso) return '';

  const d = parseDate(iso);
  if (!d) return iso;

  return `${formatPersianTime(d)} · ${formatPersianPostDate(d)}`;
}

/**
 * متا پایین حباب فید — ساعت · نویسنده · تاریخ شمسی
 * (همه به وقت ایران)
 */
export function formatPostBubbleMeta(
  iso: string | null | undefined,
  authorName?: string | null,
): string {
  const author = authorName?.trim();
  if (!iso) return author ?? '';

  const d = parseDate(iso);
  if (!d) return author ?? iso;

  const parts: string[] = [formatPersianTime(d)];
  if (author) parts.push(author);
  parts.push(formatPersianPostDate(d));
  return parts.join(' · ');
}
