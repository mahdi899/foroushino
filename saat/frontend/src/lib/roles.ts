import type { Role } from '@/types'

const MANAGEMENT_ROLES: Role[] = ['leader', 'supervisor', 'manager', 'admin']

export function isManagementRole(role: Role): boolean {
  return MANAGEMENT_ROLES.includes(role)
}

export function isAgentRole(role: Role): boolean {
  return role === 'agent'
}
