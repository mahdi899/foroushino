import type { Agent, Call, Lead, Role, Team } from '@/types'
import { isManagementRole } from '@/lib/roles'
import { isLeadVisibleToAgent } from '@/lib/leadUtils'
import { dateKeyFromIso, todayDateKey } from '@/lib/shiftUtils'

export function getManagedTeam(teams: Team[], userId: string, role: Role): Team | null {
  if (role === 'leader') {
    return teams.find((team) => team.leaderId === userId) ?? null
  }

  return null
}

export function getTeamAgentIds(
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): string[] {
  const team = getManagedTeam(teams, userId, role)
  if (team) return team.agentIds

  if (isManagementRole(role)) {
    return agents.filter((agent) => agent.role === 'agent').map((agent) => agent.id)
  }

  return [userId]
}

export function filterLeadsForScope(
  leads: Lead[],
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): Lead[] {
  if (!isManagementRole(role)) {
    return leads
  }

  const managedTeam = getManagedTeam(teams, userId, role)
  if (managedTeam) {
    const agentIds = new Set(managedTeam.agentIds)
    return leads.filter(
      (lead) =>
        lead.assignedTeamId === managedTeam.id ||
        (!!lead.assignedAgentId && agentIds.has(lead.assignedAgentId)),
    )
  }

  const agentIds = new Set(getTeamAgentIds(teams, agents, userId, role))
  return leads.filter((lead) => !lead.assignedAgentId || agentIds.has(lead.assignedAgentId))
}

export function isLeadInScope(
  lead: Lead,
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): boolean {
  if (!isManagementRole(role)) {
    return isLeadVisibleToAgent(lead, userId)
  }

  return filterLeadsForScope([lead], teams, agents, userId, role).length > 0
}

export function filterCallsForTeam(
  calls: Call[],
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): Call[] {
  const agentIds = new Set(getTeamAgentIds(teams, agents, userId, role))
  return calls.filter((call) => agentIds.has(call.agentId))
}

export function teamCallsToday(
  calls: Call[],
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): Call[] {
  const today = todayDateKey()
  return filterCallsForTeam(calls, teams, agents, userId, role)
    .filter((call) => dateKeyFromIso(call.createdAt) === today)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export function agentById(agents: Agent[], id: string): Agent | undefined {
  return agents.find((agent) => agent.id === id)
}

export function teamAgents(teams: Team[], agents: Agent[], teamId: string): Agent[] {
  const team = teams.find((t) => t.id === teamId)
  if (!team) return []
  return agents.filter((agent) => team.agentIds.includes(agent.id))
}

export function leaderForTeam(agents: Agent[], leaderId: string): Agent | undefined {
  return agents.find((agent) => agent.id === leaderId)
}

export function leadById(leads: Lead[], id: string): Lead | undefined {
  return leads.find((lead) => lead.id === id)
}
