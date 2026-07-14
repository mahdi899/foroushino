import { Home, Users, ClipboardCheck, BarChart3, Radio, type LucideIcon } from 'lucide-react'
import type { Role } from '@/types'
import { isLeaderRole, isManagementRole, isManagerRole, isSupervisorRole } from '@/lib/roles'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

const agentNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/leads', label: 'سرنخ‌ها', icon: Users },
  { path: '/followups', label: 'پیگیری‌ها', icon: ClipboardCheck },
  { path: '/performance', label: 'گزارش‌ها', icon: BarChart3 },
]

const leaderNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/team', label: 'تیم من', icon: Radio },
  { path: '/leads', label: 'سرنخ‌ها', icon: Users },
  { path: '/reports', label: 'گزارش‌ها', icon: BarChart3 },
]

const supervisorNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/teams', label: 'تیم‌ها', icon: Radio },
  { path: '/leads', label: 'سرنخ‌ها', icon: Users },
  { path: '/reports', label: 'گزارش‌ها', icon: BarChart3 },
]

const managerNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/teams', label: 'تیم‌ها', icon: Radio },
  { path: '/leads', label: 'سرنخ‌ها', icon: Users },
  { path: '/reports', label: 'گزارش‌ها', icon: BarChart3 },
]

const managementNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/leads', label: 'سرنخ‌ها', icon: Users },
  { path: '/followups', label: 'پیگیری‌ها', icon: ClipboardCheck },
  { path: '/reports', label: 'گزارش‌ها', icon: BarChart3 },
]

export function navForRole(role: Role): NavItem[] {
  if (isLeaderRole(role)) return leaderNav
  if (isSupervisorRole(role)) return supervisorNav
  if (isManagerRole(role)) return managerNav
  return isManagementRole(role) ? managementNav : agentNav
}
