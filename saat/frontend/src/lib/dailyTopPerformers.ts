import type { Agent, Role, Team } from '@/types'
import { isAgentRole } from '@/lib/roles'
import { getTeamAgentIds } from '@/lib/teamUtils'

export const DAILY_TOP_PERFORMER_COUNT = 3

export type DailyTopRank = 1 | 2 | 3

function compareDailyPerformance(a: Agent, b: Agent): number {
  return b.successfulToday - a.successfulToday || b.callsToday - a.callsToday
}

export function sortAgentsByDailyPerformance(agents: Agent[]): Agent[] {
  return [...agents].sort(compareDailyPerformance)
}

export function getAgentTeamPeers(
  target: Agent,
  agents: Agent[],
  teams: Team[],
  userId: string,
  role: Role,
): Agent[] {
  return sortAgentsByDailyPerformance(peersForAgent(target, agents, teams, userId, role))
}

export function rankDailyTopPerformers(agents: Agent[]): Agent[] {
  return [...agents].sort(compareDailyPerformance).slice(0, DAILY_TOP_PERFORMER_COUNT)
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

export function getDailyTopPerformerRank(
  agentId: string,
  agents: Agent[],
  teams: Team[],
  userId: string,
  role: Role,
): DailyTopRank | null {
  const target = agents.find((member) => member.id === agentId)
  if (!target || target.role !== 'agent') return null

  const peers = peersForAgent(target, agents, teams, userId, role)
  const top = rankDailyTopPerformers(peers)
  const index = top.findIndex((member) => member.id === agentId)
  if (index < 0) return null

  return (index + 1) as DailyTopRank
}
