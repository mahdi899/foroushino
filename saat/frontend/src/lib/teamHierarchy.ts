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

function buildMembersByTeamId(teams: Team[], agents: Agent[]): Map<string, Agent[]> {
  const agentsById = new Map(agents.map((agent) => [agent.id, agent]))
  const byTeamId = new Map<string, Agent[]>()

  for (const team of teams) {
    const members = team.agentIds
      .map((id) => agentsById.get(id))
      .filter((agent): agent is Agent => agent != null && agent.role === 'agent')

    if (members.length === 0) {
      const fallback = agents.filter((agent) => agent.teamId === team.id && agent.role === 'agent')
      byTeamId.set(team.id, fallback)
      continue
    }

    byTeamId.set(team.id, members)
  }

  return byTeamId
}

function buildPendingSalesByTeamId(
  sales: { teamId: string; status: string }[],
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const sale of sales) {
    if (sale.status !== 'pending_confirmation') continue
    counts.set(sale.teamId, (counts.get(sale.teamId) ?? 0) + 1)
  }
  return counts
}

function buildReportsByTeamId(teamReports: TeamReport[], today: string): Map<string, TeamReport> {
  const reports = new Map<string, TeamReport>()
  for (const report of teamReports) {
    if (report.reportDate !== today) continue
    reports.set(report.teamId, report)
  }
  return reports
}

export function buildTeamHierarchyRows(
  teams: Team[],
  agents: Agent[],
  sales: { teamId: string; status: string }[],
  teamReports: TeamReport[],
  today: string,
): TeamHierarchyRow[] {
  const membersByTeamId = buildMembersByTeamId(teams, agents)
  const pendingSalesByTeamId = buildPendingSalesByTeamId(sales)
  const reportsByTeamId = buildReportsByTeamId(teamReports, today)

  return teams.map((team) => {
    const members = membersByTeamId.get(team.id) ?? teamAgents(teams, agents, team.id)
    const callsToday = members.reduce((sum, agent) => sum + agent.callsToday, 0)
    const successfulToday = members.reduce((sum, agent) => sum + agent.successfulToday, 0)
    const conversion =
      callsToday > 0 ? Math.round((successfulToday / callsToday) * 1000) / 10 : 0

    return {
      team,
      leader: leaderForTeam(agents, team.leaderId) ?? null,
      members,
      callsToday,
      conversion,
      pendingSales: pendingSalesByTeamId.get(team.id) ?? 0,
      report: reportsByTeamId.get(team.id),
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

/** All supervisors first (even with zero teams), then unassigned teams bucket. */
export function buildSupervisorHierarchyList(
  supervisors: Agent[],
  rows: TeamHierarchyRow[],
  agents: Agent[],
): SupervisorHierarchyGroup[] {
  const grouped = groupTeamsBySupervisor(rows, agents)
  const bySupervisorId = new Map(
    grouped
      .filter((group) => group.supervisorId != null)
      .map((group) => [group.supervisorId as string, group]),
  )

  const result = supervisors
    .map((supervisor) => {
      const existing = bySupervisorId.get(supervisor.id)
      if (existing) return existing

      const name = `${supervisor.firstName} ${supervisor.lastName}`.trim()
      return {
        supervisorId: supervisor.id,
        supervisorName: name,
        supervisor,
        teams: [],
        teamCount: 0,
        agentCount: 0,
      } satisfies SupervisorHierarchyGroup
    })
    .sort((a, b) => a.supervisorName.localeCompare(b.supervisorName, 'fa'))

  const unassigned = grouped.find((group) => group.supervisorId == null)
  if (unassigned) result.push(unassigned)

  return result
}

export function sortTeamHierarchyRows(rows: TeamHierarchyRow[]): TeamHierarchyRow[] {
  return [...rows].sort((a, b) => a.team.name.localeCompare(b.team.name, 'fa'))
}
