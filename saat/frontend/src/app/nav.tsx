import type { ComponentType } from 'react'
import type { NavIconProps } from '@/components/layout/NavIcons'
import {
  NavFollowupsIcon,
  NavHomeIcon,
  NavLeadsIcon,
  NavProfileIcon,
  NavTeamIcon,
  NavTeamsIcon,
} from '@/components/layout/NavIcons'
import type { Role } from '@/types'
import { LEADS_WORD } from '@/lib/leadLabels'
import { isLeaderRole, isManagementRole, isManagerRole, isSupervisorRole } from '@/lib/roles'

export interface NavItem {
  path: string
  label: string
  icon: ComponentType<NavIconProps>
}

const LEADS_NAV_LABEL = LEADS_WORD

const agentNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: NavHomeIcon },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: NavLeadsIcon },
  { path: '/followups', label: 'پیگیری‌ها', icon: NavFollowupsIcon },
  { path: '/profile', label: 'پروفایل', icon: NavProfileIcon },
]

const leaderNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: NavHomeIcon },
  { path: '/team', label: 'تیم من', icon: NavTeamIcon },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: NavLeadsIcon },
  { path: '/profile', label: 'پروفایل', icon: NavProfileIcon },
]

const supervisorNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: NavHomeIcon },
  { path: '/teams', label: 'تیم‌ها', icon: NavTeamsIcon },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: NavLeadsIcon },
  { path: '/profile', label: 'پروفایل', icon: NavProfileIcon },
]

const managerNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: NavHomeIcon },
  { path: '/teams', label: 'تیم‌ها', icon: NavTeamsIcon },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: NavLeadsIcon },
  { path: '/profile', label: 'پروفایل', icon: NavProfileIcon },
]

const managementNav: NavItem[] = [
  { path: '/home', label: 'خانه', icon: NavHomeIcon },
  { path: '/leads', label: LEADS_NAV_LABEL, icon: NavLeadsIcon },
  { path: '/followups', label: 'پیگیری‌ها', icon: NavFollowupsIcon },
  { path: '/profile', label: 'پروفایل', icon: NavProfileIcon },
]

export function navForRole(role: Role): NavItem[] {
  if (isLeaderRole(role)) return leaderNav
  if (isSupervisorRole(role)) return supervisorNav
  if (isManagerRole(role)) return managerNav
  return isManagementRole(role) ? managementNav : agentNav
}
