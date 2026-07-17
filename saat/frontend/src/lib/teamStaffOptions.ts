import type { TeamStaffOption } from '@/components/domain/TeamFormSheet'
import type { Agent, Team } from '@/types'

function sortByName(a: TeamStaffOption, b: TeamStaffOption) {
  return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'fa')
}

export function buildTeamStaffOptions(agents: Agent[], teams: Team[]) {
  const teamName = (teamId?: string) => teams.find((team) => team.id === teamId)?.name ?? null

  const mapAgent = (agent: Agent): TeamStaffOption => ({
    id: agent.id,
    firstName: agent.firstName,
    lastName: agent.lastName,
    teamId: agent.teamId,
    teamName: teamName(agent.teamId),
  })

  return {
    leaders: agents.filter((agent) => agent.role === 'leader').map(mapAgent).sort(sortByName),
    members: agents.filter((agent) => agent.role === 'agent').map(mapAgent).sort(sortByName),
    supervisors: agents
      .filter((agent) => agent.role === 'supervisor')
      .map(mapAgent)
      .sort(sortByName),
  }
}

export function memberIdsForTeam(teamId: string, agents: Agent[]): string[] {
  return agents
    .filter((agent) => agent.teamId === teamId && agent.role === 'agent')
    .map((agent) => agent.id)
}
