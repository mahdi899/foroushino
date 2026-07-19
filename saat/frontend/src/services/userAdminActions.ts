import { http } from '@/services/http'
import { mapAgentFromAdmin } from '@/services/mappers'
import { useStore } from '@/store/useStore'
import {
  getUsersInflight,
  invalidateAdminDirectory,
  isAdminUsersFresh,
  readCachedAdminUsers,
  setUsersInflight,
  writeCachedAdminUsers,
} from '@/services/adminDataCache'

type Dto = Record<string, unknown>

export interface CreateAgentInput {
  name: string
  phone: string
  teamId: string
  password: string
}

export interface CreateStaffInput {
  name: string
  phone: string
  role: 'supervisor' | 'leader' | 'agent' | 'super-admin' | 'manager' | 'admin'
  teamId?: string
  email?: string
  password?: string
}

export interface UpdateAgentInput {
  name?: string
  phone?: string
  teamId?: string | null
  isActive?: boolean
  bankCard?: string
  confirmBankCard?: boolean
}

async function loadAdminAgentsFromApi(): Promise<ReturnType<typeof mapAgentFromAdmin>[]> {
  const raw = await http.get<Dto[]>('/admin/users')
  const agents = raw.map(mapAgentFromAdmin)
  useStore.getState().setAgents(agents)
  writeCachedAdminUsers(agents)
  return agents
}

export async function fetchAdminAgents(force = false) {
  if (!force) {
    const cached = readCachedAdminUsers()
    if (cached) {
      if (useStore.getState().agents.length === 0) {
        useStore.getState().setAgents(cached)
      }
      return cached
    }

    const inflight = getUsersInflight()
    if (inflight) return inflight
  }

  const promise = loadAdminAgentsFromApi().finally(() => setUsersInflight(null))
  setUsersInflight(promise)
  return promise
}

export async function ensureAdminAgentsLoaded(force = false) {
  if (
    !force &&
    isAdminUsersFresh() &&
    useStore.getState().agents.length > 0
  ) {
    return useStore.getState().agents
  }
  return fetchAdminAgents(force)
}

export async function createAgent(input: CreateAgentInput) {
  return createStaff({ ...input, role: 'agent', teamId: input.teamId })
}

export async function createStaff(input: CreateStaffInput) {
  const payload: Dto = {
    name: input.name,
    phone: input.phone,
    role: input.role,
  }
  if (input.teamId && /^\d+$/.test(String(input.teamId))) {
    payload.team_id = Number(input.teamId)
  }
  if (input.email) payload.email = input.email
  if (input.password) payload.password = input.password

  const raw = await http.post<Dto>('/admin/users', payload)
  const agent = mapAgentFromAdmin(raw)

  if (input.role === 'leader' && input.teamId) {
    const team = useStore.getState().teams.find((row) => row.id === input.teamId)
    if (team) {
      useStore.getState().upsertTeam({ ...team, leaderId: agent.id })
    }
  }

  invalidateAdminDirectory()
  useStore.getState().upsertAgent(agent)
  return agent
}

export async function updateAgent(agentId: string, input: UpdateAgentInput) {
  const payload: Dto = {}
  if (input.name != null) payload.name = input.name
  if (input.phone != null) payload.phone = input.phone
  if (input.teamId !== undefined) {
    payload.team_id = input.teamId ? Number(input.teamId) : null
  }
  if (input.isActive != null) payload.is_active = input.isActive
  if (input.bankCard != null) payload.bank_card = input.bankCard.replace(/\D/g, '')
  if (input.confirmBankCard != null) payload.confirm_bank_card = input.confirmBankCard

  const raw = await http.patch<Dto>(`/admin/users/${agentId}`, payload)
  const agent = mapAgentFromAdmin(raw)
  invalidateAdminDirectory()
  useStore.getState().upsertAgent(agent)
  return agent
}

export async function suspendAgent(agentId: string) {
  return updateAgent(agentId, { isActive: false })
}

export async function activateAgent(agentId: string) {
  return updateAgent(agentId, { isActive: true })
}
