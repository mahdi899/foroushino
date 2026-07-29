const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/** Convert Latin digits in a string to Persian digits. Leaves other chars alone. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Format a number with Persian digits and Persian comma (،) as thousands separator. */
export function formatFa(n: number): string {
  return toPersianDigits(n.toLocaleString("en-US")).replace(/,/g, "٬");
}

/** Panel / price display — Persian digits + «،» (renders reliably in Peyda). */
export function formatPanelFa(n: number): string {
  return toPersianDigits(Math.round(n).toLocaleString("en-US")).replace(/,/g, "،");
}

/** Format an ISO date as a Persian (Jalali) date string, e.g. «۶ فروردین ۱۴۰۵». */
export function formatDateFa(iso: string): string {
  const raw = iso.trim();
  if (!raw) return iso;

  // Date-only (YYYY-MM-DD): parse as local calendar day to avoid UTC shift.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  let d: Date;
  if (dateOnly) {
    d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12, 0, 0);
  } else {
    d = new Date(raw);
  }

  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
