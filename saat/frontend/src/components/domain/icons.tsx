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
  type LucideIcon,
} from 'lucide-react'
import type { CallResult, LeadSource } from '@/types'

export const sourceIcon: Record<LeadSource, LucideIcon> = {
  instagram: Instagram,
  website: Globe,
  telegram: Send,
  ads: Megaphone,
  webinar: Video,
  form: ClipboardList,
  excel: FileSpreadsheet,
}

export const sourceColor: Record<LeadSource, string> = {
  instagram: 'secondary',
  website: 'cold',
  telegram: 'cold',
  ads: 'accent',
  webinar: 'secondary',
  form: 'primary',
  excel: 'success',
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
}

export const achievementIcon: Record<string, LucideIcon> = {
  flame: Flame,
  target: Target,
  phone: Phone,
  rocket: Rocket,
  gem: Gem,
  heart: Heart,
}
