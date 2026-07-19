import { http } from '@/services/http'
import { mapTeamFromAdmin } from '@/services/mappers'
import { useStore } from '@/store/useStore'
import {
  getTeamsInflight,
  invalidateAdminDirectory,
  readCachedAdminTeams,
  setTeamsInflight,
  writeCachedAdminTeams,
} from '@/services/adminDataCache'
import type { Team } from '@/types'

type Dto = Record<string, unknown>

export interface CreateTeamInput {
  name: string
  leaderId?: string
  supervisorId?: string
  agentIds?: string[]
}

export interface UpdateTeamInput {
  name?: string
  leaderId?: string | null
  supervisorId?: string | null
  agentIds?: string[]
}

function memberIdsForTeam(teamId: string): string[] {
  return useStore
    .getState()
    .agents.filter((agent) => agent.teamId === teamId && agent.role === 'agent')
    .map((agent) => agent.id)
}

function mapTeamsFromAdmin(raw: Dto[], agents = useStore.getState().agents): Team[] {
  return (Array.isArray(raw) ? raw : []).map((dto) =>
    mapTeamFromAdmin(
      dto,
      agents
        .filter((agent) => agent.teamId === String(dto.id) && agent.role === 'agent')
        .map((agent) => agent.id),
    ),
  )
}

export async function syncTeamMembers(teamId: string, agentIds: string[]): Promise<void> {
  const payload = { agent_ids: agentIds.map((id) => Number(id)) }
  await http.put<Dto>(`/admin/teams/${teamId}/members`, payload)

  const agents = useStore.getState().agents
  const desired = new Set(agentIds)
  const nextAgents = agents.map((agent) => {
    if (agent.role !== 'agent') return agent
    if (desired.has(agent.id)) return { ...agent, teamId }
    if (agent.teamId === teamId) return { ...agent, teamId: '' }
    return agent
  })
  useStore.getState().setAgents(nextAgents)

  const team = useStore.getState().teams.find((row) => row.id === teamId)
  if (team) {
    useStore.getState().upsertTeam({
      ...team,
      agentIds,
      agentsCount: agentIds.length,
    })
  }

  invalidateAdminDirectory()
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const payload: Dto = { name: input.name.trim() }
  if (input.leaderId) payload.leader_id = Number(input.leaderId)
  if (input.supervisorId) payload.supervisor_id = Number(input.supervisorId)

  const raw = await http.post<Dto>('/admin/teams', payload)
  const teamId = String(raw.id)
  let memberIds = memberIdsForTeam(teamId)

  if (input.agentIds?.length) {
    await syncTeamMembers(teamId, input.agentIds)
    memberIds = input.agentIds
  }

  const team = mapTeamFromAdmin(raw, memberIds)
  invalidateAdminDirectory()
  useStore.getState().upsertTeam(team)
  return team
}

export async function deleteTeam(teamId: string): Promise<void> {
  await http.del(`/admin/teams/${teamId}`)

  const state = useStore.getState()
  const nextAgents = state.agents.map((agent) =>
    agent.teamId === teamId ? { ...agent, teamId: '' } : agent,
  )
  state.setAgents(nextAgents)
  state.setTeams(state.teams.filter((team) => team.id !== teamId))
  invalidateAdminDirectory()
}

export async function updateTeam(teamId: string, input: UpdateTeamInput): Promise<Team> {
  const payload: Dto = {}
  if (input.name != null) payload.name = input.name.trim()
  if (input.leaderId !== undefined) {
    payload.leader_id = input.leaderId ? Number(input.leaderId) : null
  }
  if (input.supervisorId !== undefined) {
    payload.supervisor_id = input.supervisorId ? Number(input.supervisorId) : null
  }

  const raw = await http.patch<Dto>(`/admin/teams/${teamId}`, payload)

  if (input.agentIds) {
    await syncTeamMembers(teamId, input.agentIds)
  }

  const team = mapTeamFromAdmin(raw, input.agentIds ?? memberIdsForTeam(teamId))
  invalidateAdminDirectory()
  useStore.getState().upsertTeam(team)
  return team
}

export async function assignSupervisorTeams(supervisorId: string, teamIds: string[]): Promise<void> {
  await http.patch<Dto>(`/admin/supervisors/${supervisorId}/teams`, {
    team_ids: teamIds.map((id) => Number(id)),
  })
  invalidateAdminDirectory()
  await refreshTeamsFromAdmin(true)
}

async function loadTeamsFromApi(): Promise<Team[]> {
  const raw = await http.get<Dto[]>('/admin/teams')
  const teams = mapTeamsFromAdmin(raw)
  useStore.getState().setTeams(teams)
  writeCachedAdminTeams(teams)
  return teams
}

export async function refreshTeamsFromAdmin(force = false): Promise<Team[]> {
  if (!force) {
    const cached = readCachedAdminTeams()
    if (cached) {
      if (useStore.getState().teams.length === 0) {
        useStore.getState().setTeams(cached)
      }
      return cached
    }

    const inflight = getTeamsInflight()
    if (inflight) return inflight
  }

  const promise = loadTeamsFromApi().finally(() => setTeamsInflight(null))
  setTeamsInflight(promise)
  return promise
}
