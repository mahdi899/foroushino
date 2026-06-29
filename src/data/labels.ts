import type {
  CallResult,
  LeadSource,
  Objection,
  Priority,
  Role,
  SaleStage,
  Temperature,
  ExperienceLevel,
  FollowupKind,
} from '@/types'

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
  hot: 'داغ',
  warm: 'گرم',
  cold: 'سرد',
}

export const priorityLabels: Record<Priority, string> = {
  1: 'پایین',
  2: 'متوسط',
  3: 'بالا',
}

export const stageLabels: Record<SaleStage, string> = {
  new: 'لید جدید',
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
  manager: 'مدیر فروش',
}

export const experienceLabels: Record<ExperienceLevel, string> = {
  none: 'بدون تجربه',
  beginner: 'مبتدی',
  intermediate: 'متوسط',
  advanced: 'حرفه‌ای',
}

export const followupKindLabels: Record<FollowupKind, string> = {
  call: 'تماس تلفنی',
  message: 'پیگیری پیام',
  reminder: 'یادآوری',
  meeting: 'جلسه',
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
}

// Positive (successful) results
export const positiveResults: CallResult[] = [
  'interested',
  'very_hot',
  'meeting_set',
  'payment_pending',
  'registered',
]
