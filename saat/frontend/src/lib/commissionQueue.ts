import type { Commission, Role } from '@/types'
import type { Agent, Team } from '@/types'
import { getTeamAgentIds } from '@/lib/teamUtils'
import { isLeaderRole, isSupervisorRole } from '@/lib/roles'

function withAgentName(commission: Commission, agents: Agent[]): Commission {
  if (commission.agentName) return commission
  const agent = agents.find((row) => row.id === commission.agentId)
  if (!agent) return commission
  return { ...commission, agentName: `${agent.firstName} ${agent.lastName}` }
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
    mode === 'leader' && isLeaderRole(role)
      ? commissions.filter((c) => c.status === 'pending' && teamAgentIds.includes(c.agentId))
      : mode === 'supervisor' && isSupervisorRole(role)
        ? commissions.filter((c) => c.status === 'approved')
        : []

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

export function countPendingCommissionsForSupervisor(
  commissions: Commission[],
  role: Role,
): number {
  if (!isSupervisorRole(role)) return 0
  return commissions.filter((c) => c.status === 'approved').length
}
