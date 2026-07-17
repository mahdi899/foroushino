import { http } from '@/services/http'
import { mapAgentFromAdmin } from '@/services/mappers'
import { useStore } from '@/store/useStore'

type Dto = Record<string, unknown>

export interface CreateAgentInput {
  name: string
  phone: string
  teamId: string
}

export interface CreateStaffInput {
  name: string
  phone: string
  role: 'supervisor' | 'leader' | 'agent'
  teamId?: string
}

export interface UpdateAgentInput {
  name?: string
  phone?: string
  teamId?: string | null
  isActive?: boolean
  bankCard?: string
  confirmBankCard?: boolean
}

export async function fetchAdminAgents() {
  const raw = await http.get<Dto[]>('/admin/users')
  const agents = raw.map(mapAgentFromAdmin)
  const upsertAgent = useStore.getState().upsertAgent
  for (const agent of agents) {
    upsertAgent(agent)
  }
  return agents
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
  if (input.teamId) payload.team_id = Number(input.teamId)

  const raw = await http.post<Dto>('/admin/users', payload)
  const agent = mapAgentFromAdmin(raw)
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
  useStore.getState().upsertAgent(agent)
  return agent
}

export async function suspendAgent(agentId: string) {
  return updateAgent(agentId, { isActive: false })
}

export async function activateAgent(agentId: string) {
  return updateAgent(agentId, { isActive: true })
}
