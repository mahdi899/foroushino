import type { ConsultationQuestion } from './types';

// Smart consultation question flow (RTL, progressive). Answers map to a
// suggested treatment category + price range. This is initial guidance only —
// not a diagnosis (medical disclaimer enforced in UI).
export const consultationQuestions: ConsultationQuestion[] = [
  {
    key: 'goal',
    question: 'چه چیزی برایتان مهم‌تر است؟',
    helper: 'یک گزینه را انتخاب کنید',
    options: [
      { value: 'missing', label: 'جایگزینی دندان از دست‌رفته', maps: ['implant'] },
      { value: 'beauty', label: 'زیبایی و طراحی لبخند', maps: ['laminate', 'cosmetic'] },
      { value: 'color', label: 'سفیدتر و یکدست‌تر شدن', maps: ['cosmetic'] },
      { value: 'unknown', label: 'مطمئن نیستم', maps: ['implant', 'laminate', 'cosmetic'] },
    ],
  },
  {
    key: 'scope',
    question: 'وضعیت فعلی شما چطور است؟',
    options: [
      { value: 'one', label: 'یک یا چند دندان' },
      { value: 'many', label: 'تعداد زیادی دندان' },
      { value: 'full', label: 'کل لبخند' },
      { value: 'notsure', label: 'نمی‌دانم' },
    ],
  },
  {
    key: 'timeline',
    question: 'چه زمانی قصد شروع دارید؟',
    options: [
      { value: 'now', label: 'همین حالا' },
      { value: 'month', label: 'تا یک ماه آینده' },
      { value: 'explore', label: 'فقط بررسی می‌کنم' },
    ],
  },
  {
    key: 'budget',
    question: 'ترجیح پرداخت شما چیست؟',
    helper: 'اختیاری — برای پیشنهاد بهتر',
    options: [
      { value: 'cash', label: 'نقدی' },
      { value: 'installment', label: 'اقساطی' },
      { value: 'vip', label: 'خدمات VIP' },
      { value: 'undecided', label: 'هنوز تصمیم نگرفته‌ام' },
    ],
  },
];

// Treatment recommendation map keyed by primary goal answer.
// Price ranges mirror /pricing treatment lines (per unit, from).
export const recommendationMap: Record<
  string,
  { service: string; label: string; priceFrom: number; priceTo: number; note: string }
> = {
  missing: {
    service: 'implant',
    label: 'ایمپلنت دیجیتال',
    priceFrom: 21500000,
    priceTo: 26000000,
    note: 'برای جایگزینی دندان، ایمپلنت دیجیتال بهترین گزینه دائمی است.',
  },
  beauty: {
    service: 'laminate',
    label: 'لمینت سرامیکی / طراحی لبخند',
    priceFrom: 17500000,
    priceTo: 22500000,
    note: 'برای زیبایی لبخند، لمینت سرامیکی یا کامپوزیت پیشنهاد می‌شود.',
  },
  color: {
    service: 'cosmetic',
    label: 'بلیچینگ و زیبایی',
    priceFrom: 5800000,
    priceTo: 9500000,
    note: 'برای روشن‌تر شدن، بلیچینگ تخصصی یا کامپوزیت گزینه مناسبی است.',
  },
  unknown: {
    service: 'implant',
    label: 'مشاوره تخصصی',
    priceFrom: 5800000,
    priceTo: 26000000,
    note: 'با چند سؤال کوتاه و در صورت نیاز عکس، بهترین مسیر را پیشنهاد می‌دهیم.',
  },
};
