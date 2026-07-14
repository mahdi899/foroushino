import { http } from '@/services/http'
import { mapTeamFromAdmin } from '@/services/mappers'
import { useStore } from '@/store/useStore'
import type { Team } from '@/types'

type Dto = Record<string, unknown>

export interface CreateTeamInput {
  name: string
  leaderId?: string
}

export interface UpdateTeamInput {
  name?: string
  leaderId?: string | null
}

function memberIdsForTeam(teamId: string): string[] {
  return useStore
    .getState()
    .agents.filter((agent) => agent.teamId === teamId && agent.role === 'agent')
    .map((agent) => agent.id)
}

export async function createTeam(input: CreateTeamInput): Promise<Team> {
  const payload: Dto = { name: input.name.trim() }
  if (input.leaderId) payload.leader_id = Number(input.leaderId)

  const raw = await http.post<Dto>('/admin/teams', payload)
  const team = mapTeamFromAdmin(raw, memberIdsForTeam(String(raw.id)))
  useStore.getState().upsertTeam(team)
  return team
}

export async function updateTeam(teamId: string, input: UpdateTeamInput): Promise<Team> {
  const payload: Dto = {}
  if (input.name != null) payload.name = input.name.trim()
  if (input.leaderId !== undefined) {
    payload.leader_id = input.leaderId ? Number(input.leaderId) : null
  }

  const raw = await http.patch<Dto>(`/admin/teams/${teamId}`, payload)
  const team = mapTeamFromAdmin(raw, memberIdsForTeam(teamId))
  useStore.getState().upsertTeam(team)
  return team
}

export async function refreshTeamsFromAdmin(): Promise<Team[]> {
  const raw = await http.get<Dto[]>('/admin/teams')
  const agents = useStore.getState().agents
  const teams = (Array.isArray(raw) ? raw : []).map((dto) =>
    mapTeamFromAdmin(
      dto,
      agents
        .filter((agent) => agent.teamId === String(dto.id) && agent.role === 'agent')
        .map((agent) => agent.id),
    ),
  )
  useStore.setState({ teams })
  return teams
}
