import type { Role } from '@/types'
import { formatPhone, maskPhone } from '@/lib/format'
import { isAgentRole, isLeaderRole, isManagerRole, isSupervisorRole } from '@/lib/roles'

/** Masking is enforced by role — not a user preference. */
export function canControlPhoneMask(_role: Role): boolean {
  return false
}

export function shouldMaskCustomerPhones(role: Role, _maskPreference = true): boolean {
  if (isManagerRole(role) || isSupervisorRole(role)) return false
  if (isAgentRole(role) || isLeaderRole(role)) return true
  return true
}

export function formatCustomerPhone(phone: string, role: Role): string {
  return shouldMaskCustomerPhones(role) ? maskPhone(phone) : formatPhone(phone)
}

export function phoneMaskToggleLabel(role: Role): string {
  if (isAgentRole(role) || isLeaderRole(role)) {
    return 'شماره مشتریان در این نقش پنهان می‌ماند'
  }
  if (isManagerRole(role) || isSupervisorRole(role)) {
    return 'در نقش مدیریتی همیشه نمایش داده می‌شود'
  }
  return 'مطابق سیاست سازمان'
}
