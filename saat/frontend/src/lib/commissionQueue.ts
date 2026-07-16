import type { Commission, Role } from '@/types'
import type { Agent, Team } from '@/types'
import { getTeamAgentIds } from '@/lib/teamUtils'
import { isLeaderRole, isManagerRole, isSupervisorRole } from '@/lib/roles'
import { hasPermission } from '@/lib/permissions'

function withAgentName(commission: Commission, agents: Agent[]): Commission {
  if (commission.agentName) return commission
  const agent = agents.find((row) => row.id === commission.agentId)
  if (!agent) return commission
  return { ...commission, agentName: `${agent.firstName} ${agent.lastName}` }
}

/** Leader queue first; supervisor/manager only see leader-approved rows. */
export function resolveCommissionApprovalMode(
  role: Role,
  permissions: readonly string[],
): 'leader' | 'supervisor' | null {
  if (isLeaderRole(role) && hasPermission(permissions, 'commissions.approve-leader')) {
    return 'leader'
  }
  if (
    hasPermission(permissions, 'commissions.approve-supervisor') &&
    (isSupervisorRole(role) || isManagerRole(role))
  ) {
    return 'supervisor'
  }
  return null
}

export function filterCommissionQueue(
  commissions: Commission[],
  agents: Agent[],
  teams: Team[],
  userId: string,
  role: Role,
  mode: 'leader' | 'supervisor',
): Commission[] {
  const teamAgentIds = getTeamAgentIds(teams, agents, userId, role)

  const rows =
    mode === 'leader'
      ? commissions.filter((c) => c.status === 'pending' && teamAgentIds.includes(c.agentId))
      : commissions.filter((c) => c.status === 'approved')

  return rows.map((row) => withAgentName(row, agents))
}

export function countPendingCommissionsForLeader(
  commissions: Commission[],
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): number {
  return filterCommissionQueue(commissions, agents, teams, userId, role, 'leader').length
}

export function countPendingCommissionsForSupervisor(commissions: Commission[]): number {
  return commissions.filter((c) => c.status === 'approved').length
}
