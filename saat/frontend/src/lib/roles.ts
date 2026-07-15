import type { Role } from '@/types'

const MANAGEMENT_ROLES: Role[] = ['leader', 'supervisor', 'manager', 'admin']

/** Legacy `admin` is the same operational role as `manager`. */
export function normalizeRole(role: Role): Role {
  return role === 'admin' ? 'manager' : role
}

export function isManagementRole(role: Role): boolean {
  return MANAGEMENT_ROLES.includes(role)
}

export function isAgentRole(role: Role): boolean {
  return role === 'agent'
}

export function isLeaderRole(role: Role): boolean {
  return role === 'leader'
}

export function isSupervisorRole(role: Role): boolean {
  return role === 'supervisor'
}

export function isManagerRole(role: Role): boolean {
  return normalizeRole(role) === 'manager'
}

export function hasMultiTeamView(role: Role): boolean {
  return isManagerRole(role)
}

export function canMakeCalls(role: Role): boolean {
  return role === 'agent'
}
