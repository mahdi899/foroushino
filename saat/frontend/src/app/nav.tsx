import { Home, Users, ClipboardCheck, Radio, User, type LucideIcon } from 'lucide-react'
import type { Role } from '@/types'
import { LEADS_WORD } from '@/lib/leadLabels'
import { isLeaderRole, isManagementRole, isManagerRole, isSupervisorRole } from '@/lib/roles'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

const LEADS_NAV_LABEL = LEADS_WORD

const agentNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: Users },
  { path: '/followups', label: 'پیگیری‌ها', icon: ClipboardCheck },
  { path: '/profile', label: 'پروفایل', icon: User },
]

const leaderNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/team', label: 'تیم من', icon: Radio },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: Users },
  { path: '/profile', label: 'پروفایل', icon: User },
]

const supervisorNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/teams', label: 'تیم‌ها', icon: Radio },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: Users },
  { path: '/profile', label: 'پروفایل', icon: User },
]

const managerNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/teams', label: 'تیم‌ها', icon: Radio },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: Users },
  { path: '/profile', label: 'پروفایل', icon: User },
]

const managementNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: Users },
  { path: '/followups', label: 'پیگیری‌ها', icon: ClipboardCheck },
  { path: '/profile', label: 'پروفایل', icon: User },
]

export function navForRole(role: Role): NavItem[] {
  if (isLeaderRole(role)) return leaderNav
  if (isSupervisorRole(role)) return supervisorNav
  if (isManagerRole(role)) return managerNav
  return isManagementRole(role) ? managementNav : agentNav
}
