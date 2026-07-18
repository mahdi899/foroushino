import type { Agent, Role, Team } from '@/types'
import { isAgentRole } from '@/lib/roles'
import { getTeamAgentIds } from '@/lib/teamUtils'

export const MONTHLY_TOP_PERFORMER_COUNT = 3

function compareMonthlyPerformance(a: Agent, b: Agent): number {
  return (
    (b.pointsThisMonth ?? 0) - (a.pointsThisMonth ?? 0) ||
    (b.successfulThisMonth ?? 0) - (a.successfulThisMonth ?? 0) ||
    (b.callsThisMonth ?? 0) - (a.callsThisMonth ?? 0)
  )
}

export function sortAgentsByMonthlyPerformance(agents: Agent[]): Agent[] {
  return [...agents].sort(compareMonthlyPerformance)
}

function peersForAgent(
  target: Agent,
  agents: Agent[],
  teams: Team[],
  userId: string,
  role: Role,
): Agent[] {
  if (isAgentRole(role)) {
    if (!target.teamId) {
      return agents.filter((member) => member.role === 'agent' && member.id === target.id)
    }
    return agents.filter((member) => member.role === 'agent' && member.teamId === target.teamId)
  }

  const teamAgentIds = getTeamAgentIds(teams, agents, userId, role)
  return agents.filter((member) => member.role === 'agent' && teamAgentIds.includes(member.id))
}

export function getAgentTeamPeersMonthly(
  target: Agent,
  agents: Agent[],
  teams: Team[],
  userId: string,
  role: Role,
): Agent[] {
  return sortAgentsByMonthlyPerformance(peersForAgent(target, agents, teams, userId, role))
}

export function rankMonthlyTopPerformers(agents: Agent[]): Agent[] {
  return sortAgentsByMonthlyPerformance(agents).slice(0, MONTHLY_TOP_PERFORMER_COUNT)
}
