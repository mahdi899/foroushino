function parseDate(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** کلید روز برای گروه‌بندی پست‌ها */
export function getPostDayKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = parseDate(iso);
  return d ? dayKey(d) : null;
}

/** برچسب جداکننده روز — امروز، دیروز، یا تاریخ شمسی */
export function formatFeedDaySeparator(iso: string): string {
  const d = parseDate(iso);
  if (!d) return iso;

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(d, today)) return 'امروز';
  if (isSameDay(d, yesterday)) return 'دیروز';

  return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
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

  const time = new Intl.DateTimeFormat('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(d, today)) return time;
  if (isSameDay(d, yesterday)) return `${time} · دیروز`;

  const date = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);

  return `${time} · ${date}`;
}
