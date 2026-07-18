import {
  Instagram,
  Globe,
  Send,
  Megaphone,
  Video,
  ClipboardList,
  FileSpreadsheet,
  Heart,
  Flame,
  Clock,
  CalendarCheck,
  CreditCard,
  UserCheck,
  PhoneMissed,
  PowerOff,
  Hash,
  BellOff,
  Info,
  Users,
  PhoneForwarded,
  Smile,
  Frown,
  Target,
  Phone,
  Rocket,
  Gem,
  Copy,
  BadgeDollarSign,
  CalendarClock,
  CircleSlash,
  Headset,
  Coffee,
  ClipboardCheck,
  MoonStar,
  AlarmClockCheck,
  Sparkle,
  ThermometerSun,
  Layers,
  Wallet as WalletIcon,
  ArrowUpCircle,
  ArrowDownCircle,
  Undo2,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import type { Availability, CallResult, SuggestReason, WalletTxType } from '@/types'

export const sourceIcon: Record<string, LucideIcon> = {
  instagram: Instagram,
  website: Globe,
  telegram: Send,
  ads: Megaphone,
  webinar: Video,
  form: ClipboardList,
  excel: FileSpreadsheet,
  bahram: Sparkle,
}

export function resolveSourceIcon(source: string): LucideIcon {
  return sourceIcon[source] ?? Globe
}

export const sourceColor: Record<string, string> = {
  instagram: 'secondary',
  website: 'cold',
  telegram: 'cold',
  ads: 'accent',
  webinar: 'secondary',
  form: 'primary',
  excel: 'success',
}

/** Static Tailwind classes — never use dynamic `text-${sourceColor}-500` */
export const sourceIconClass: Record<string, string> = {
  instagram: 'text-secondary-500',
  website: 'text-cold-500',
  telegram: 'text-cold-500',
  ads: 'text-accent-500',
  webinar: 'text-secondary-500',
  form: 'text-primary-500',
  excel: 'text-success-500',
  bahram: 'text-primary-500',
}

export function resolveSourceIconClass(source: string): string {
  return sourceIconClass[source] ?? 'text-neutral-500'
}

export const sourceBadgeClass: Record<string, string> = {
  instagram: 'bg-secondary-500',
  website: 'bg-cold-500',
  telegram: 'bg-cold-500',
  ads: 'bg-accent-500',
  webinar: 'bg-secondary-500',
  form: 'bg-primary-600',
  excel: 'bg-success-500',
}

export const resultIcon: Record<CallResult, LucideIcon> = {
  interested: Smile,
  very_hot: Flame,
  needs_followup: Clock,
  meeting_set: CalendarCheck,
  payment_pending: CreditCard,
  registered: UserCheck,
  no_answer: PhoneMissed,
  unavailable: PowerOff,
  wrong_number: Hash,
  not_interested: Frown,
  do_not_disturb: BellOff,
  needs_info: Info,
  not_decision_maker: Users,
  call_later: PhoneForwarded,
  duplicate: Copy,
  price_objection: BadgeDollarSign,
  bad_timing: CalendarClock,
  incomplete_call: CircleSlash,
}

export type ResultTone = 'hot' | 'success' | 'warning' | 'primary' | 'secondary' | 'error' | 'neutral'

export const resultTone: Record<CallResult, ResultTone> = {
  interested: 'success',
  very_hot: 'hot',
  needs_followup: 'warning',
  meeting_set: 'secondary',
  payment_pending: 'accent' as ResultTone,
  registered: 'success',
  no_answer: 'neutral',
  unavailable: 'neutral',
  wrong_number: 'neutral',
  not_interested: 'error',
  do_not_disturb: 'error',
  needs_info: 'cold' as ResultTone,
  not_decision_maker: 'warning',
  call_later: 'primary',
  duplicate: 'neutral',
  price_objection: 'warning',
  bad_timing: 'primary',
  incomplete_call: 'error',
}

export const availabilityIcon: Record<Availability, LucideIcon> = {
  available: Headset,
  in_call: Phone,
  on_break: Coffee,
  doing_follow_up: ClipboardCheck,
  offline: MoonStar,
}

export type AvailabilityTone = 'success' | 'primary' | 'warning' | 'secondary' | 'neutral'

export const availabilityTone: Record<Availability, AvailabilityTone> = {
  available: 'success',
  in_call: 'primary',
  on_break: 'warning',
  doing_follow_up: 'warning',
  offline: 'neutral',
}

export const availabilityDotClass: Record<Availability, string> = {
  available: 'bg-success-500',
  in_call: 'bg-primary-500',
  on_break: 'bg-warning-500',
  doing_follow_up: 'bg-warning-500',
  offline: 'bg-neutral-300',
}

export const suggestReasonIcon: Record<SuggestReason, LucideIcon> = {
  overdue_follow_up: AlarmClockCheck,
  today_follow_up: CalendarCheck,
  hot_in_window: Flame,
  interested_needs_follow_up: Sparkle,
  fresh_high_prob: Rocket,
  warm: ThermometerSun,
  cold: Layers,
  from_pool: Users,
}

export const suggestReasonChipLabel: Record<SuggestReason, string> = {
  overdue_follow_up: 'پیگیری عقب‌افتاده',
  today_follow_up: 'بهترین زمان تماس',
  hot_in_window: 'مشتری داغ',
  interested_needs_follow_up: 'نزدیک به خرید',
  fresh_high_prob: 'تازه ثبت‌شده',
  warm: 'احتمال بالا',
  cold: 'مشتری سرد',
  from_pool: 'از صف عمومی',
}

export const walletTxIcon: Record<WalletTxType, LucideIcon> = {
  commission_pending: Clock,
  commission_approved: ClipboardCheck,
  commission_available: WalletIcon,
  payout_requested: ArrowUpCircle,
  payout_paid: ArrowDownCircle,
  payout_rejected: Undo2,
  reversal: Undo2,
  adjustment: SlidersHorizontal,
}

export const walletTxTone: Record<WalletTxType, ResultTone> = {
  commission_pending: 'warning',
  commission_approved: 'primary',
  commission_available: 'success',
  payout_requested: 'primary',
  payout_paid: 'success',
  payout_rejected: 'error',
  reversal: 'error',
  adjustment: 'neutral',
}

export const achievementIcon: Record<string, LucideIcon> = {
  flame: Flame,
  target: Target,
  phone: Phone,
  rocket: Rocket,
  gem: Gem,
  heart: Heart,
}
