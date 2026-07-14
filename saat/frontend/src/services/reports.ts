import { http } from './http'

export interface ReportsApiPayload {
  pipeline: Record<string, number>
  sources: Array<{ source: string; count: number; conversion_rate: number }>
  weak_agents: Array<{ agent_id: number; name: string; calls: number; success_rate: number }>
  overdue: { count: number }
  suspicious: Array<{ agent_id: number; name: string; reason: string }>
}

export async function fetchReportsBundle(): Promise<ReportsApiPayload> {
  const [pipeline, sources, weakAgents, overdue, suspicious] = await Promise.all([
    http.get<Record<string, number>>('/reports/pipeline'),
    http.get<ReportsApiPayload['sources']>('/reports/sources'),
    http.get<ReportsApiPayload['weak_agents']>('/reports/weak-agents'),
    http.get<{ count: number }>('/reports/overdue'),
    http.get<ReportsApiPayload['suspicious']>('/reports/suspicious'),
  ])

  return { pipeline, sources, weak_agents: weakAgents, overdue, suspicious }
}

export interface LiveOpsPayload {
  kpis: Record<string, number>
  active_calls: unknown[]
  overdue_followups: number
  queued_leads: number
}

export async function fetchLiveOpsDashboard(teamId?: string): Promise<LiveOpsPayload> {
  const query = teamId ? `?team_id=${teamId}` : ''
  return http.get<LiveOpsPayload>(`/live-ops/dashboard${query}`)
}
