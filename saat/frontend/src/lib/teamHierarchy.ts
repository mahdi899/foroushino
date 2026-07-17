import { leaderForTeam, teamAgents } from '@/lib/teamUtils'
import type { Agent, Team, TeamReport } from '@/types'

export type TeamHierarchyRow = {
  team: Team
  leader: Agent | null
  members: Agent[]
  callsToday: number
  conversion: number
  pendingSales: number
  report?: TeamReport
}

export type SupervisorHierarchyGroup = {
  supervisorId: string | null
  supervisorName: string
  supervisor: Agent | null
  teams: TeamHierarchyRow[]
  teamCount: number
  agentCount: number
}

const UNASSIGNED_SUPERVISOR_KEY = '__unassigned__'

function supervisorKey(team: Team): string {
  return team.supervisorId ?? UNASSIGNED_SUPERVISOR_KEY
}

export function buildTeamHierarchyRows(
  teams: Team[],
  agents: Agent[],
  sales: { teamId: string; status: string }[],
  teamReports: TeamReport[],
  today: string,
): TeamHierarchyRow[] {
  return teams.map((team) => {
    const members = teamAgents(teams, agents, team.id)
    const callsToday = members.reduce((sum, agent) => sum + agent.callsToday, 0)
    const successfulToday = members.reduce((sum, agent) => sum + agent.successfulToday, 0)
    const conversion =
      callsToday > 0 ? Math.round((successfulToday / callsToday) * 1000) / 10 : 0
    const pendingSales = sales.filter(
      (sale) => sale.teamId === team.id && sale.status === 'pending_confirmation',
    ).length
    const report = teamReports.find((row) => row.teamId === team.id && row.reportDate === today)

    return {
      team,
      leader: leaderForTeam(agents, team.leaderId) ?? null,
      members,
      callsToday,
      conversion,
      pendingSales,
      report,
    }
  })
}

export function groupTeamsBySupervisor(
  rows: TeamHierarchyRow[],
  agents: Agent[],
): SupervisorHierarchyGroup[] {
  const groups = new Map<string, SupervisorHierarchyGroup>()

  for (const row of rows) {
    const key = supervisorKey(row.team)
    const existing = groups.get(key)

    if (existing) {
      existing.teams.push(row)
      existing.teamCount += 1
      existing.agentCount += row.members.length
      continue
    }

    const supervisor =
      row.team.supervisorId != null
        ? agents.find((agent) => agent.id === row.team.supervisorId && agent.role === 'supervisor') ??
          null
        : null

    const supervisorName =
      row.team.supervisorName ??
      (supervisor ? `${supervisor.firstName} ${supervisor.lastName}`.trim() : 'بدون ناظر')

    groups.set(key, {
      supervisorId: row.team.supervisorId ?? null,
      supervisorName,
      supervisor,
      teams: [row],
      teamCount: 1,
      agentCount: row.members.length,
    })
  }

  return [...groups.values()].sort((a, b) => {
    if (a.supervisorId == null) return 1
    if (b.supervisorId == null) return -1
    return a.supervisorName.localeCompare(b.supervisorName, 'fa')
  })
}
