import { http } from '@/services/http'
import { mapTeamFromAdmin } from '@/services/mappers'
import { useStore } from '@/store/useStore'
import { updateAgent } from '@/services/userAdminActions'
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

export async function syncTeamMembers(teamId: string, agentIds: string[]): Promise<void> {
  const agents = useStore.getState().agents.filter((agent) => agent.role === 'agent')
  const desired = new Set(agentIds)
  const tasks: Promise<unknown>[] = []

  for (const agent of agents) {
    const onThisTeam = agent.teamId === teamId
    const shouldBeOn = desired.has(agent.id)

    if (onThisTeam && !shouldBeOn) {
      tasks.push(updateAgent(agent.id, { teamId: null }))
    } else if (!onThisTeam && shouldBeOn) {
      tasks.push(updateAgent(agent.id, { teamId }))
    }
  }

  await Promise.all(tasks)

  const team = useStore.getState().teams.find((row) => row.id === teamId)
  if (team) {
    useStore.getState().upsertTeam({
      ...team,
      agentIds,
      agentsCount: agentIds.length,
    })
  }
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
  useStore.getState().upsertTeam(team)
  return team
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
  useStore.getState().upsertTeam(team)
  return team
}

export async function assignSupervisorTeams(supervisorId: string, teamIds: string[]): Promise<void> {
  const teams = useStore.getState().teams
  const desired = new Set(teamIds)
  const currentIds = teams
    .filter((team) => String(team.supervisorId ?? '') === String(supervisorId))
    .map((team) => team.id)

  const toAssign = teamIds.filter((teamId) => {
    const team = teams.find((row) => row.id === teamId)
    return String(team?.supervisorId ?? '') !== String(supervisorId)
  })
  const toUnassign = currentIds.filter((teamId) => !desired.has(teamId))

  for (const teamId of toUnassign) {
    await updateTeam(teamId, { supervisorId: null })
  }
  for (const teamId of toAssign) {
    await updateTeam(teamId, { supervisorId })
  }

  await refreshTeamsFromAdmin()
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
