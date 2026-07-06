import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const faNumber = new Intl.NumberFormat('fa-IR');

/** Group a number with Persian digits and the Persian thousands separator (٬). */
export function formatNumber(amount: number): string {
  return faNumber.format(Math.round(amount));
}

/** Format a Toman amount with Persian digits and thousands separators. */
export function formatToman(amount: number): string {
  return `${formatNumber(amount)} تومان`;
}

/** Format a compact price range. */
export function formatRange(min: number, max?: number | null): string {
  if (!max || max === min) return formatToman(min);
  return `${formatNumber(min)} تا ${formatToman(max)}`;
}

/** Convert Latin digits to Persian digits. */
export function toFa(input: string | number): string {
  const fa = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return String(input).replace(/\d/g, (d) => fa[Number(d)]);
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}
