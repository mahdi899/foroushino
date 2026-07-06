/** Lead status keys (API) → Persian labels. Mirrors backend LeadStatusSeeder. */
export const LEAD_STATUS_LABELS: Record<string, string> = {
  NEW: 'جدید',
  CONTACTED: 'تماس گرفته‌شده',
  QUALIFIED: 'واجد شرایط',
  BOOKED: 'رزرو شده',
  WON: 'موفق',
  LOST: 'از دست رفته',
};

export const LEAD_STATUSES = Object.keys(LEAD_STATUS_LABELS);

export function leadStatusLabel(name: string, fallbackLabel?: string | null): string {
  return fallbackLabel || LEAD_STATUS_LABELS[name] || name;
}
