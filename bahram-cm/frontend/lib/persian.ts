const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/** Convert Latin digits in a string to Persian digits. Leaves other chars alone. */
export function toPersianDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Format a number with Persian thousands separator (٬) + Persian digits. */
export function formatFa(n: number): string {
  return toPersianDigits(n.toLocaleString("en-US")).replace(/,/g, "٬");
}

/** Format a date (YYYY-MM-DD) as a Persian-friendly short string. */
export function formatDateFa(iso: string): string {
  const months = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
  ];
  // Convert Gregorian -> Jalali via Intl (uses Persian calendar)
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  const parts = fmt.formatToParts(d);
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  const monthIdx = Number(
    parts.find((p) => p.type === "month")?.value ?? "1",
  ) - 1;
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  return `${day} ${months[monthIdx] ?? ""} ${year}`;
}
