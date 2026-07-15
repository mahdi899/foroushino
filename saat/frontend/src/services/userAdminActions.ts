import { http } from '@/services/http'
import { mapAgentFromAdmin } from '@/services/mappers'
import { useStore } from '@/store/useStore'

type Dto = Record<string, unknown>

export interface CreateAgentInput {
  name: string
  phone: string
  teamId: string
}

export interface UpdateAgentInput {
  name?: string
  phone?: string
  teamId?: string
  isActive?: boolean
  bankCard?: string
  confirmBankCard?: boolean
}

export async function createAgent(input: CreateAgentInput) {
  const raw = await http.post<Dto>('/admin/users', {
    name: input.name,
    phone: input.phone,
    team_id: Number(input.teamId),
  })
  const agent = mapAgentFromAdmin(raw)
  useStore.getState().upsertAgent(agent)
  return agent
}

export async function updateAgent(agentId: string, input: UpdateAgentInput) {
  const payload: Dto = {}
  if (input.name != null) payload.name = input.name
  if (input.phone != null) payload.phone = input.phone
  if (input.teamId != null) payload.team_id = Number(input.teamId)
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
