import type { Role } from '@/types'
import { normalizeRole } from '@/lib/roles'

/** Full system-management permission set for manager in mock/offline mode. */
const MANAGER_PERMISSIONS: string[] = [
  'leads.view',
  'leads.manage',
  'leads.import',
  'leads.reassign',
  'calls.view',
  'followups.view',
  'sales.view',
  'sales.view-team',
  'sales.confirm',
  'sales.review-payment',
  'sales.register-payment',
  'wallet.view',
  'wallet.manage-payouts',
  'reports.view',
  'reports.view-team',
  'reports.view-all',
  'reports.approve-team',
  'users.view',
  'users.manage',
  'users.manage-team',
  'commissions.approve-leader',
  'commissions.approve-supervisor',
  'teams.manage',
  'training.view',
  'training.manage',
  'admin.products',
  'admin.settings',
]

const MOCK_ROLE_PERMISSIONS: Partial<Record<Role, string[]>> = {
  leader: [
    'leads.view',
    'leads.view-team',
    'sales.view',
    'sales.view-team',
    'sales.review-payment',
    'reports.view',
    'reports.view-team',
    'reports.submit-team',
    'reports.approve-agent',
    'commissions.approve-leader',
    'wallet.view',
    'wallet.view-team',
  ],
  supervisor: [
    'leads.view',
    'leads.manage',
    'leads.import',
    'leads.reassign',
    'sales.view',
    'sales.view-team',
    'sales.confirm',
    'sales.review-payment',
    'sales.register-payment',
    'reports.view',
    'reports.view-team',
    'reports.approve-team',
    'commissions.approve-supervisor',
    'wallet.view',
    'wallet.view-team',
    'wallet.manage-payouts',
    'users.view',
    'users.manage-team',
  ],
  manager: MANAGER_PERMISSIONS,
}

export function resolvePermissions(role: Role, permissions: string[]): string[] {
  const normalized = normalizeRole(role)
  return permissions.length > 0 ? permissions : (MOCK_ROLE_PERMISSIONS[normalized] ?? [])
}

export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission)
}

export function hasAnyPermission(permissions: string[], names: string[]): boolean {
  return names.some((name) => permissions.includes(name))
}
