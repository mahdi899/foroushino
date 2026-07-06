const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/** Convert Latin digits in a string to Persian digits. Leaves other chars alone. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Format a number with Persian thousands separator (٬) + Persian digits. */
export function formatFa(n: number): string {
  return toPersianDigits(n.toLocaleString("en-US")).replace(/,/g, "٬");
}

/** Format an ISO date as a Persian (Jalali) date string, e.g. «۶ فروردین ۱۴۰۵». */
export function formatDateFa(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
