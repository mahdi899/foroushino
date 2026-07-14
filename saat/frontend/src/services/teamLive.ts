import type { Agent, Availability, Call, Team } from '@/types'
import { conversionRateFromStats } from '@/lib/dailyGoal'
import { http } from './http'
import { mapCall, splitName, id } from './mappers'

type Dto = Record<string, unknown>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export interface TeamLiveMember {
  agentId: string
  firstName: string
  lastName: string
  avatar: string | null
  availability: Availability
  callsToday: number
  successfulToday: number
  activeCallLeadId: string | null
  activeCallLeadName: string | null
}

export interface TeamLiveData {
  teamId: string | null
  onlineCount: number
  members: TeamLiveMember[]
  recentCalls: Call[]
}

export function mapTeamLiveMember(dto: Dto): TeamLiveMember {
  const agent = (dto.agent as Dto) ?? {}
  const { firstName, lastName } = splitName(agent.name as string)
  const activeCall = dto.active_call as Dto | null | undefined

  return {
    agentId: id(agent.id as string | number),
    firstName,
    lastName,
    avatar: (agent.avatar as string | null) ?? null,
    availability: (dto.availability as Availability) ?? 'offline',
    callsToday: Number(dto.calls_today ?? 0),
    successfulToday: Number(dto.successful_today ?? 0),
    activeCallLeadId:
      activeCall?.lead_id != null ? id(activeCall.lead_id as string | number) : null,
    activeCallLeadName: (activeCall?.lead_name as string) ?? null,
  }
}

export async function fetchTeamLive(teamId?: string | null): Promise<TeamLiveData> {
  const query = teamId ? `?team_id=${encodeURIComponent(teamId)}` : ''
  const raw = await http.get<Dto>(`/team/live${query}`)

  return {
    teamId: raw.team_id != null ? id(raw.team_id as string | number) : null,
    onlineCount: Number(raw.online_count ?? 0),
    members: asArray<Dto>(raw.members).map(mapTeamLiveMember),
    recentCalls: asArray<Dto>(raw.recent_calls).map(mapCall),
  }
}

function agentFromLiveMember(member: TeamLiveMember, teamId: string): Agent {
  return {
    id: member.agentId,
    firstName: member.firstName,
    lastName: member.lastName,
    role: 'agent',
    teamId,
    avatar: member.avatar,
    phone: '',
    level: 1,
    callsToday: member.callsToday,
    successfulToday: member.successfulToday,
    conversionRate: conversionRateFromStats(member.callsToday, member.successfulToday),
    points: 0,
    streak: 0,
    callGoal: 0,
  }
}

/** Build agent roster for leaders without admin user listing access. */
export function agentsFromTeamLive(live: TeamLiveData, self: Agent): Agent[] {
  const teamId = live.teamId ?? self.teamId
  const fromLive = live.members.map((member) => agentFromLiveMember(member, teamId))
  if (fromLive.some((agent) => agent.id === self.id)) return fromLive
  return [self, ...fromLive]
}

export function teamsFromTeamLive(
  live: TeamLiveData,
  leaderId: string,
  teamName = 'تیم من',
): Team[] {
  if (!live.teamId) return []

  return [
    {
      id: live.teamId,
      name: teamName,
      leaderId,
      agentIds: live.members.map((member) => member.agentId),
    },
  ]
}

/** Merge team-live KPIs into the synced agent list for management dashboards. */
export function mergeTeamLiveIntoAgents(agents: Agent[], live: TeamLiveData): Agent[] {
  const byId = new Map(live.members.map((member) => [member.agentId, member]))

  return agents.map((agent) => {
    const liveMember = byId.get(agent.id)
    if (!liveMember) return agent

    return {
      ...agent,
      callsToday: liveMember.callsToday,
      successfulToday: liveMember.successfulToday,
      conversionRate: conversionRateFromStats(liveMember.callsToday, liveMember.successfulToday),
    }
  })
}
