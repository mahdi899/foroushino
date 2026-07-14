export type InferredGender = 'male' | 'female' | 'unknown'

const FEMALE_FIRST_NAMES = new Set([
  'فاطمه',
  'زهرا',
  'مریم',
  'سارا',
  'نرگس',
  'الهام',
  'مینا',
  'لیلا',
  'شیما',
  'پریسا',
  'نازنین',
  'مهسا',
  'سمیرا',
  'فرناز',
  'آتنا',
  'ریحانه',
  'حدیث',
  'صدیق',
  'زینب',
  'فریبا',
  'نسرین',
  'شیدا',
  'آیدا',
  'بهاره',
  'گلناز',
])

const MALE_FIRST_NAMES = new Set([
  'علی',
  'محمد',
  'حسین',
  'رضا',
  'امیر',
  'مهدی',
  'احمد',
  'سعید',
  'حامد',
  'پویا',
  'آرمان',
  'کیان',
  'بهرام',
  'مسعود',
  'مجید',
  'حمید',
  'جواد',
  'امیرحسین',
  'محسن',
  'علیرضا',
])

/** Best-effort gender hint from first name when CRM has no gender field. */
export function inferLeadGender(firstName: string): InferredGender {
  const name = firstName.trim()
  if (!name) return 'unknown'
  if (FEMALE_FIRST_NAMES.has(name)) return 'female'
  if (MALE_FIRST_NAMES.has(name)) return 'male'
  if (name.endsWith('ه') && name.length > 2) return 'female'
  return 'unknown'
}
