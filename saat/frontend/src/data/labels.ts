import type {
  CallResult,
  LeadSource,
  LeadStatus,
  NextAction,
  SuggestReason,
  Objection,
  Priority,
  Role,
  SaleStage,
  SaleStatus,
  CommissionStatus,
  WalletTxType,
  PayoutStatus,
  Availability,
  PaymentMethod,
  Temperature,
  ExperienceLevel,
  FollowupKind,
} from '@/types'
import { LEAD_WORD, LEADS_WORD } from '@/lib/leadLabels'

export { LEAD_WORD, LEADS_WORD }

export const sourceLabels: Record<LeadSource, string> = {
  instagram: 'اینستاگرام',
  website: 'سایت',
  telegram: 'تلگرام',
  ads: 'تبلیغات',
  webinar: 'وبینار',
  form: 'فرم ثبت‌نام',
  excel: 'اکسل وارد شده',
}

export const temperatureLabels: Record<Temperature, string> = {
  hot: 'خیلی جدی',
  warm: 'علاقه‌مند',
  cold: 'کم‌علاقه',
}

/** Plain-language guide for agents when picking lead temperature. */
export const temperatureGuide: Record<
  Temperature,
  { title: string; description: string; example: string }
> = {
  hot: {
    title: 'خیلی جدی',
    description: 'احتمال خرید بالاست؛ زود تماس بگیر.',
    example: 'مثلاً: «همین هفته ثبت‌نام می‌کنم»',
  },
  warm: {
    title: 'علاقه‌مند',
    description: 'پیگیری می‌خواهد؛ هنوز تصمیم نهایی نگرفته.',
    example: 'مثلاً: «با خانواده مشورت می‌کنم»',
  },
  cold: {
    title: 'کم‌علاقه',
    description: 'فعلاً اولویت پایین؛ زمان تماس بیشتری لازم است.',
    example: 'مثلاً: «الان وقتش نیست»',
  },
}

export const priorityLabels: Record<Priority, string> = {
  1: 'پایین',
  2: 'متوسط',
  3: 'بالا',
}

export const stageLabels: Record<SaleStage, string> = {
  new: `${LEAD_WORD} جدید`,
  first_call: 'تماس اول',
  interested: 'علاقه‌مند',
  follow_up: 'پیگیری',
  meeting: 'جلسه/مشاوره',
  payment_pending: 'پرداخت در انتظار',
  won: 'ثبت‌نام موفق',
  lost: 'از دست رفته',
}

export const stageOrder: SaleStage[] = [
  'new',
  'first_call',
  'interested',
  'follow_up',
  'meeting',
  'payment_pending',
  'won',
]

export const resultLabels: Record<CallResult, string> = {
  interested: 'علاقه‌مند',
  very_hot: 'خیلی داغ',
  needs_followup: 'نیاز به پیگیری',
  meeting_set: 'جلسه تنظیم شد',
  payment_pending: 'پرداخت در انتظار',
  registered: 'ثبت‌نام شد',
  no_answer: 'پاسخ نداد',
  unavailable: 'خاموش / در دسترس نبود',
  wrong_number: 'شماره اشتباه',
  not_interested: 'علاقه‌مند نیست',
  do_not_disturb: 'مزاحم نشو',
  needs_info: 'نیاز به اطلاعات بیشتر',
  not_decision_maker: 'تصمیم‌گیرنده نیست',
  call_later: 'بعداً تماس بگیر',
  duplicate: 'تکراری',
  price_objection: 'قیمت بالا بود',
  bad_timing: 'زمان مناسب نبود',
  incomplete_call: 'تماس ناقص ماند',
}

// Short helper text describing the next step for each result
export const resultHint: Partial<Record<CallResult, string>> = {
  no_answer: 'یک تلاش مجدد برایت زمان‌بندی می‌شود.',
  unavailable: 'یک تلاش مجدد برایت زمان‌بندی می‌شود.',
  interested: 'یک پیگیری هوشمند ساخته می‌شود.',
  very_hot: 'یک پیگیری فوری ساخته می‌شود.',
  needs_followup: 'زمان پیگیری را انتخاب کن.',
  meeting_set: 'جلسه در تقویم پیگیری ثبت می‌شود.',
  payment_pending: 'یک فروش در انتظار پرداخت ساخته می‌شود.',
  registered: 'فروش برای تایید ارسال می‌شود؛ پورسانت معلق می‌شود.',
  do_not_disturb: `${LEAD_WORD} از چرخه تماس خارج می‌شود.`,
  wrong_number: `${LEAD_WORD} بسته می‌شود.`,
  duplicate: `${LEAD_WORD} به‌عنوان تکراری علامت می‌خورد.`,
  not_interested: `${LEAD_WORD} بسته می‌شود.`,
  needs_info: 'یک پیگیری برای ارسال اطلاعات ساخته می‌شود.',
  price_objection: 'اعتراض قیمت ثبت و پیگیری ساخته می‌شود.',
  bad_timing: 'یک تلاش مجدد در زمان بهتر ثبت می‌شود.',
  call_later: 'یک تلاش مجدد ثبت می‌شود.',
  not_decision_maker: 'پیگیری با تصمیم‌گیرنده ساخته می‌شود.',
  incomplete_call: 'به سوپروایزر برای بررسی ارجاع می‌شود.',
}

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: 'جدید',
  assigned: 'تخصیص داده شده',
  queued: 'در صف تماس',
  locked: 'قفل شده برای تماس',
  in_call: 'در حال تماس',
  contacted: 'تماس گرفته شده',
  follow_up_required: 'نیاز به پیگیری',
  follow_up_overdue: 'پیگیری عقب‌افتاده',
  consultation_scheduled: 'جلسه تنظیم شد',
  payment_pending: 'پرداخت در انتظار',
  payment_submitted: 'پرداخت ثبت شد',
  sale_pending_confirmation: 'فروش در انتظار تایید',
  won: 'فروش موفق',
  lost: 'از دست رفته',
  no_answer: 'پاسخ نداد',
  unreachable: 'در دسترس نبود',
  wrong_number: 'شماره اشتباه',
  duplicate: 'تکراری',
  do_not_call: 'مزاحم نشو',
  returned_to_pool: 'برگشت به صف',
  needs_supervisor_review: 'نیازمند بررسی سوپروایزر',
}

// Tone class family used by badges for each status
export const leadStatusTone: Record<LeadStatus, 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'hot'> = {
  new: 'neutral',
  assigned: 'primary',
  queued: 'neutral',
  locked: 'warning',
  in_call: 'primary',
  contacted: 'primary',
  follow_up_required: 'warning',
  follow_up_overdue: 'error',
  consultation_scheduled: 'primary',
  payment_pending: 'warning',
  payment_submitted: 'warning',
  sale_pending_confirmation: 'warning',
  won: 'success',
  lost: 'neutral',
  no_answer: 'neutral',
  unreachable: 'neutral',
  wrong_number: 'error',
  duplicate: 'error',
  do_not_call: 'error',
  returned_to_pool: 'neutral',
  needs_supervisor_review: 'error',
}

export const nextActionLabels: Record<NextAction, string> = {
  schedule_retry: 'تلاش مجدد',
  create_follow_up: 'ساخت پیگیری',
  create_payment_pending_sale: 'فروش در انتظار پرداخت',
  create_sale_pending_confirmation: 'فروش در انتظار تایید',
  schedule_consultation: 'تنظیم جلسه',
  mark_do_not_call: 'خروج از چرخه تماس',
  close_lead: `بستن ${LEAD_WORD}`,
  mark_duplicate: 'علامت تکراری',
  needs_review: 'ارجاع به بررسی',
  none: '-',
}

export const suggestReasonLabels: Record<SuggestReason, string> = {
  overdue_follow_up: 'پیگیری عقب‌افتاده',
  today_follow_up: 'پیگیری امروز',
  hot_in_window: `${LEAD_WORD} داغ در بهترین زمان تماس`,
  interested_needs_follow_up: 'علاقه‌مند، نیاز به پیگیری',
  fresh_high_prob: 'تازه ثبت‌شده با احتمال تبدیل بالا',
  warm: `${LEAD_WORD} گرم`,
  cold: `${LEAD_WORD} سرد`,
  from_pool: 'از صف عمومی',
}

export const saleStatusLabels: Record<SaleStatus, string> = {
  draft: 'پیش‌نویس',
  payment_pending: 'پرداخت در انتظار',
  payment_submitted: 'پرداخت ثبت شد',
  pending_confirmation: 'نیازمند تایید',
  confirmed: 'تایید شده',
  rejected: 'رد شده',
  cancelled: 'کنسل شده',
  refunded: 'مرجوع شده',
}

export const saleStatusTone: Record<SaleStatus, 'neutral' | 'warning' | 'primary' | 'success' | 'error'> = {
  draft: 'neutral',
  payment_pending: 'warning',
  payment_submitted: 'primary',
  pending_confirmation: 'primary',
  confirmed: 'success',
  rejected: 'error',
  cancelled: 'neutral',
  refunded: 'error',
}

export const commissionStatusLabels: Record<CommissionStatus, string> = {
  pending: 'معلق',
  approved: 'تایید شده',
  available: 'قابل برداشت',
  rejected: 'رد شده',
  paid: 'پرداخت شده',
  reversed: 'برگشت خورده',
}

export const commissionStatusTone: Record<CommissionStatus, 'neutral' | 'warning' | 'primary' | 'success' | 'error'> = {
  pending: 'warning',
  approved: 'primary',
  available: 'success',
  rejected: 'error',
  paid: 'success',
  reversed: 'error',
}

export const payoutStatusTone: Record<PayoutStatus, 'neutral' | 'warning' | 'primary' | 'success' | 'error'> = {
  requested: 'warning',
  approved: 'primary',
  paid: 'success',
  rejected: 'error',
  cancelled: 'neutral',
}

export const walletTxLabels: Record<WalletTxType, string> = {
  commission_pending: 'پورسانت معلق',
  commission_approved: 'پورسانت تایید شده',
  commission_available: 'پورسانت قابل برداشت',
  payout_requested: 'درخواست تسویه',
  payout_paid: 'تسویه پرداخت شد',
  payout_rejected: 'تسویه رد شد',
  reversal: 'برگشت',
  adjustment: 'تعدیل',
}

export const payoutStatusLabels: Record<PayoutStatus, string> = {
  requested: 'درخواست‌شده',
  approved: 'تایید شده',
  paid: 'پرداخت شده',
  rejected: 'رد شده',
  cancelled: 'کنسل شده',
}

export const availabilityLabels: Record<Availability, string> = {
  available: 'آماده تماس',
  in_call: 'در حال تماس',
  on_break: 'در استراحت',
  doing_follow_up: 'مشغول پیگیری',
  offline: 'خارج از دسترس',
}

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: 'کارت به کارت',
  gateway: 'درگاه پرداخت',
  installment: 'اقساطی',
  cash: 'نقدی',
}

// Result -> systemic next action (spec §6)
export const resultToNextAction: Record<CallResult, NextAction> = {
  interested: 'create_follow_up',
  very_hot: 'create_follow_up',
  needs_followup: 'create_follow_up',
  meeting_set: 'schedule_consultation',
  payment_pending: 'create_payment_pending_sale',
  registered: 'create_sale_pending_confirmation',
  no_answer: 'schedule_retry',
  unavailable: 'schedule_retry',
  wrong_number: 'close_lead',
  not_interested: 'close_lead',
  do_not_disturb: 'mark_do_not_call',
  needs_info: 'create_follow_up',
  not_decision_maker: 'create_follow_up',
  call_later: 'schedule_retry',
  duplicate: 'mark_duplicate',
  price_objection: 'create_follow_up',
  bad_timing: 'schedule_retry',
  incomplete_call: 'needs_review',
}

// Result -> resulting systemic lead status (spec §6)
export const resultToLeadStatus: Record<CallResult, LeadStatus> = {
  interested: 'follow_up_required',
  very_hot: 'follow_up_required',
  needs_followup: 'follow_up_required',
  meeting_set: 'consultation_scheduled',
  payment_pending: 'payment_pending',
  registered: 'sale_pending_confirmation',
  no_answer: 'no_answer',
  unavailable: 'unreachable',
  wrong_number: 'wrong_number',
  not_interested: 'lost',
  do_not_disturb: 'do_not_call',
  needs_info: 'follow_up_required',
  not_decision_maker: 'follow_up_required',
  call_later: 'follow_up_required',
  duplicate: 'duplicate',
  price_objection: 'follow_up_required',
  bad_timing: 'follow_up_required',
  incomplete_call: 'needs_supervisor_review',
}

export const objectionLabels: Record<Objection, string> = {
  price: 'قیمت بالا',
  time: 'نبود زمان',
  trust: 'اعتماد',
  need_more_info: 'اطلاعات کافی نبود',
  thinking: 'بعداً تصمیم می‌گیرم',
  spouse_decision: 'تصمیم با همسر',
  no_budget: 'بودجه ندارم',
}

export const roleLabels: Record<Role, string> = {
  agent: 'کارشناس فروش',
  leader: 'لیدر تیم',
  supervisor: 'سوپروایزر',
  manager: 'مدیر',
  admin: 'مدیر',
}

export const experienceLabels: Record<ExperienceLevel, string> = {
  none: 'بدون تجربه',
  beginner: 'مبتدی',
  intermediate: 'متوسط',
  advanced: 'حرفه‌ای',
}

export const followupKindLabels: Record<FollowupKind, string> = {
  call: 'تماس دوباره',
  message: 'ارسال پیام',
  reminder: 'یادآوری',
  meeting: 'پیگیری جلسه',
  payment: 'یادآوری پرداخت',
  consultation: 'پیگیری مشاوره',
  info: 'ارسال اطلاعات دوره',
  decision: 'پیگیری تصمیم‌گیری',
  custom: 'پیگیری سفارشی',
}

// Result -> resulting stage suggestion
export const resultToStage: Partial<Record<CallResult, SaleStage>> = {
  interested: 'interested',
  very_hot: 'interested',
  needs_followup: 'follow_up',
  meeting_set: 'meeting',
  payment_pending: 'payment_pending',
  registered: 'won',
  not_interested: 'lost',
  do_not_disturb: 'lost',
  wrong_number: 'lost',
  duplicate: 'lost',
  price_objection: 'follow_up',
  bad_timing: 'follow_up',
  needs_info: 'follow_up',
  call_later: 'follow_up',
  not_decision_maker: 'follow_up',
}

// Positive (successful) results
export const positiveResults: CallResult[] = [
  'interested',
  'very_hot',
  'meeting_set',
  'payment_pending',
  'registered',
]
