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

function isSameTehranDay(a: Date, b: Date): boolean {
  return tehranDayKey(a) === tehranDayKey(b);
}

function tehranToday(): Date {
  return new Date();
}

function tehranYesterday(): Date {
  const d = tehranToday();
  d.setDate(d.getDate() - 1);
  return d;
}

function formatPersianTime(d: Date): string {
  return timeFormatter.format(d);
}

/** روز + ماه شمسی؛ سال فقط وقتی با امسال فرق داشته باشد */
function formatPersianPostDate(d: Date): string {
  const postYear = persianDateFormatter({ year: 'numeric' }).format(d);
  const currentYear = persianDateFormatter({ year: 'numeric' }).format(tehranToday());

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

  const today = tehranToday();
  const yesterday = tehranYesterday();

  if (isSameTehranDay(d, today)) return 'امروز';
  if (isSameTehranDay(d, yesterday)) return 'دیروز';

  return persianDateFormatter({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

/** تاریخ و ساعت زیر هر پست */
export function formatPostDateTime(iso: string | null | undefined): string {
  if (!iso) return '';

  const d = parseDate(iso);
  if (!d) return iso;

  const time = formatPersianTime(d);
  const today = tehranToday();
  const yesterday = tehranYesterday();

  if (isSameTehranDay(d, today)) return time;
  if (isSameTehranDay(d, yesterday)) return `${time} · دیروز`;

  return `${time} · ${formatPersianPostDate(d)}`;
}

/** متا پایین حباب فید — زمان · نویسنده · (دیروز|تاریخ شمسی) */
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

  const today = tehranToday();
  const yesterday = tehranYesterday();

  if (isSameTehranDay(d, today)) {
    return parts.join(' · ');
  }

  if (isSameTehranDay(d, yesterday)) {
    parts.push('دیروز');
    return parts.join(' · ');
  }

  parts.push(formatPersianPostDate(d));
  return parts.join(' · ');
}
