import { Home, Users, ClipboardCheck, BarChart3, type LucideIcon } from 'lucide-react'
import type { Role } from '@/types'

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

const managementNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: Home },
  { path: '/leads', label: 'سرنخ‌ها', icon: Users },
  { path: '/followups', label: 'پیگیری‌ها', icon: ClipboardCheck },
  { path: '/reports', label: 'گزارش‌ها', icon: BarChart3 },
]

export function navForRole(role: Role): NavItem[] {
  return role === 'agent' ? agentNav : managementNav
}
