import type { Agent, Call, Lead, Role, Team } from '@/types'
import { isLeaderRole, isManagementRole, isSupervisorRole } from '@/lib/roles'
import { isLeadVisibleToAgent } from '@/lib/leadUtils'
import { dateKeyFromIso, todayDateKey } from '@/lib/shiftUtils'

export function getManagedTeam(teams: Team[], userId: string, role: Role): Team | null {
  if (isLeaderRole(role)) {
    return teams.find((team) => team.leaderId === userId) ?? null
  }

  return null
}

/** Team colony ids for leader/supervisor; null for org-wide managers. */
export function getColonyTeamIds(
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): string[] {
  const managed = getManagedTeam(teams, userId, role)
  if (managed) return [managed.id]

  if (isSupervisorRole(role)) {
    const supervised = teams.filter((team) => team.supervisorId === userId).map((team) => team.id)
    if (supervised.length > 0) return supervised

    const self = agents.find((agent) => agent.id === userId)
    if (self?.teamId) return [self.teamId]

    if (teams.length === 1) return [teams[0]?.id ?? ''].filter(Boolean)
  }

  if (isLeaderRole(role)) {
    const self = agents.find((agent) => agent.id === userId)
    if (self?.teamId) return [self.teamId]
  }

  return []
}

/** @deprecated use getColonyTeamIds */
export function getColonyTeamId(
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): string | null {
  return getColonyTeamIds(teams, agents, userId, role)[0] ?? null
}

export function getTeamAgentIds(
  teams: Team[],
  agents: Agent[],
  userId: string,
  role: Role,
): string[] {
  const colonyTeamIds = getColonyTeamIds(teams, agents, userId, role)
  if (colonyTeamIds.length > 0) {
    return agents
      .filter((agent) => agent.teamId && colonyTeamIds.includes(agent.teamId) && agent.role === 'agent')
      .map((agent) => agent.id)
  }

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

  const colonyTeamIds = getColonyTeamIds(teams, agents, userId, role)
  if (isLeaderRole(role) || isSupervisorRole(role)) {
    if (colonyTeamIds.length === 0) {
      return []
    }

    const agentIds = new Set(
      agents
        .filter((agent) => agent.teamId && colonyTeamIds.includes(agent.teamId) && agent.role === 'agent')
        .map((agent) => agent.id),
    )

    return leads.filter(
      (lead) =>
        (lead.assignedTeamId && colonyTeamIds.includes(lead.assignedTeamId)) ||
        (!!lead.assignedAgentId && agentIds.has(lead.assignedAgentId)),
    )
  }

  return leads
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
  if (!team) {
    return agents.filter((agent) => agent.teamId === teamId && agent.role === 'agent')
  }
  return agents.filter((agent) => team.agentIds.includes(agent.id))
}

export function leaderForTeam(agents: Agent[], leaderId: string): Agent | undefined {
  return agents.find((agent) => agent.id === leaderId)
}

export function leadById(leads: Lead[], id: string): Lead | undefined {
  return leads.find((lead) => lead.id === id)
}

export function supervisedTeamsForUser(teams: Team[], userId: string, role: Role): Team[] {
  if (isSupervisorRole(role)) {
    const supervised = teams.filter((team) => team.supervisorId === userId)
    return supervised.length > 0 ? supervised : teams
  }
  return teams
}
