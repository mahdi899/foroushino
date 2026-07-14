import { http } from '@/services/http'
import { useStore } from '@/store/useStore'
import { mapAgentReport } from '@/services/mappers'
import type { AgentReport, AgentReportStatus } from '@/types'
import { apiMode } from '@/services'

type Dto = Record<string, unknown>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export interface FetchAgentReportsOptions {
  status?: AgentReportStatus
  agentId?: string
  inbox?: boolean
}

export async function fetchAgentReports(
  options: FetchAgentReportsOptions = {},
): Promise<AgentReport[]> {
  const params = new URLSearchParams()
  if (options.status) params.set('status', options.status)
  if (options.agentId) params.set('agent_id', options.agentId)
  if (options.inbox) params.set('inbox', '1')
  params.set('per_page', '50')

  const raw = await http.get<Dto[]>(`/agent-reports?${params}`)
  return asArray<Dto>(raw).map(mapAgentReport)
}

export async function refreshAgentReports(options: FetchAgentReportsOptions = {}): Promise<void> {
  const reports = await fetchAgentReports(options)
  useStore.getState().setAgentReports(reports)
}

export async function performSubmitAgentReport(agentNotes?: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().submitAgentReport(agentNotes)
    return
  }

  const created = await http.post<Dto>('/agent-reports', {
    agent_notes: agentNotes ?? null,
  })
  useStore.getState().upsertAgentReport(mapAgentReport(created))
}

export async function performApproveAgentReport(
  reportId: string,
  leaderNotes?: string,
): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().approveAgentReport(reportId, leaderNotes)
    return
  }

  const updated = await http.post<Dto>(`/agent-reports/${reportId}/approve`, {
    leader_notes: leaderNotes ?? null,
  })
  useStore.getState().upsertAgentReport(mapAgentReport(updated))
}

export async function performRejectAgentReport(
  reportId: string,
  leaderNotes?: string,
): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().rejectAgentReport(reportId, leaderNotes)
    return
  }

  const updated = await http.post<Dto>(`/agent-reports/${reportId}/reject`, {
    leader_notes: leaderNotes ?? null,
  })
  useStore.getState().upsertAgentReport(mapAgentReport(updated))
}
