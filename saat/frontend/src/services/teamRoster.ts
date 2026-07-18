import type { Agent, Team } from '@/types'
import { conversionRateFromStats } from '@/lib/dailyGoal'
import { http } from './http'
import { mapAgentFromAdmin, id } from './mappers'

type Dto = Record<string, unknown>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export interface TeamRosterMember {
  agent: Dto
  callsToday: number
  successfulToday: number
  callsThisMonth: number
  successfulThisMonth: number
  pointsThisMonth: number
}

export interface TeamRosterData {
  team: {
    id: string
    name: string
    leaderId: string
    supervisorId: string | null
  }
  leader: Dto | null
  supervisor: Dto | null
  agents: TeamRosterMember[]
}

function mapRosterMember(member: Dto, teamId: string): Agent {
  const agentDto = (member.agent as Dto) ?? {}
  const callsToday = Number(member.calls_today ?? 0)
  const successfulToday = Number(member.successful_today ?? 0)
  const mapped = mapAgentFromAdmin({
    ...agentDto,
    team_id: teamId,
    calls_today: callsToday,
    successful_today: successfulToday,
  })

  return {
    ...mapped,
    teamId,
    callsToday,
    successfulToday,
    callsThisMonth: Number(member.calls_this_month ?? 0),
    successfulThisMonth: Number(member.successful_this_month ?? 0),
    pointsThisMonth: Number(member.points_this_month ?? 0),
    conversionRate: conversionRateFromStats(callsToday, successfulToday),
  }
}

function mapStaffAgent(dto: Dto | null, teamId: string): Agent | null {
  if (!dto) return null
  return mapAgentFromAdmin({ ...dto, team_id: teamId })
}

export async function fetchTeamRoster(): Promise<TeamRosterData> {
  const raw = await http.get<Dto>('/team/roster')
  const team = (raw.team as Dto) ?? {}

  return {
    team: {
      id: id(team.id as string | number),
      name: (team.name as string) ?? 'تیم من',
      leaderId: team.leader_id != null ? id(team.leader_id as string | number) : '',
      supervisorId: team.supervisor_id != null ? id(team.supervisor_id as string | number) : null,
    },
    leader: (raw.leader as Dto) ?? null,
    supervisor: (raw.supervisor as Dto) ?? null,
    agents: asArray<Dto>(raw.agents).map((member) => ({
      agent: (member.agent as Dto) ?? {},
      callsToday: Number(member.calls_today ?? 0),
      successfulToday: Number(member.successful_today ?? 0),
      callsThisMonth: Number(member.calls_this_month ?? 0),
      successfulThisMonth: Number(member.successful_this_month ?? 0),
      pointsThisMonth: Number(member.points_this_month ?? 0),
    })),
  }
}

export function agentsFromTeamRoster(roster: TeamRosterData, self: Agent): Agent[] {
  const teamId = roster.team.id
  const byId = new Map<string, Agent>()

  const leader = mapStaffAgent(roster.leader, teamId)
  if (leader) byId.set(leader.id, leader)

  const supervisor = mapStaffAgent(roster.supervisor, teamId)
  if (supervisor) byId.set(supervisor.id, supervisor)

  for (const member of roster.agents) {
    const mapped = mapRosterMember(
      {
        agent: member.agent,
        calls_today: member.callsToday,
        successful_today: member.successfulToday,
        calls_this_month: member.callsThisMonth,
        successful_this_month: member.successfulThisMonth,
        points_this_month: member.pointsThisMonth,
      },
      teamId,
    )
    byId.set(mapped.id, mapped)
  }

  const selfRoster = roster.agents.find(
    (member) => id((member.agent.id as string | number) ?? '') === self.id,
  )

  byId.set(self.id, {
    ...(byId.get(self.id) ?? self),
    ...self,
    callsToday: self.callsToday,
    successfulToday: self.successfulToday,
    conversionRate: self.conversionRate,
    points: self.points,
    streak: self.streak,
    callGoal: self.callGoal,
    callsThisMonth: selfRoster?.callsThisMonth ?? byId.get(self.id)?.callsThisMonth ?? self.callsThisMonth ?? 0,
    successfulThisMonth:
      selfRoster?.successfulThisMonth ?? byId.get(self.id)?.successfulThisMonth ?? self.successfulThisMonth ?? 0,
    pointsThisMonth: selfRoster?.pointsThisMonth ?? byId.get(self.id)?.pointsThisMonth ?? self.pointsThisMonth ?? 0,
  })

  return [...byId.values()]
}

export function teamFromTeamRoster(roster: TeamRosterData): Team {
  const leaderName = roster.leader?.name as string | undefined
  const supervisorName = roster.supervisor?.name as string | undefined

  return {
    id: roster.team.id,
    name: roster.team.name,
    leaderId: roster.team.leaderId,
    supervisorId: roster.team.supervisorId,
    leaderName: leaderName ?? null,
    supervisorName: supervisorName ?? null,
    agentIds: roster.agents.map((member) => id((member.agent.id as string | number) ?? '')),
  }
}
