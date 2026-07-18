import { apiMode } from '@/services'
import { http } from '@/services/http'
import { useStore } from '@/store/useStore'
import { mapTeamReport } from '@/services/mappers'
import type { TeamReport, TeamReportStatus, TeamReportSummary } from '@/types'

type Dto = Record<string, unknown>

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

export interface FetchTeamReportsOptions {
  status?: TeamReportStatus
  inbox?: boolean
  perPage?: number
}

export async function fetchTeamReports(options: FetchTeamReportsOptions = {}): Promise<TeamReport[]> {
  const params = new URLSearchParams()
  params.set('per_page', String(options.perPage ?? 50))
  if (options.status) params.set('status', options.status)
  if (options.inbox) params.set('inbox', '1')

  const raw = await http.get<Dto[]>(`/team-reports?${params}`)
  return asArray<Dto>(raw).map(mapTeamReport)
}

export async function refreshTeamReports(options: FetchTeamReportsOptions = {}): Promise<void> {
  const reports = await fetchTeamReports(options)
  useStore.getState().setTeamReports(reports)
}

export async function performSubmitTeamReport(payload: {
  leaderNotes?: string
  summary?: TeamReportSummary
} = {}): Promise<void> {
  if (apiMode !== 'http') {
    const ok = useStore.getState().submitTeamReport(payload.leaderNotes, payload.summary)
    if (!ok) throw new Error('تیمی برای ارسال گزارش پیدا نشد.')
    return
  }

  const created = await http.post<Dto>('/team-reports', {
    leader_notes: payload.leaderNotes ?? null,
    summary: payload.summary ?? null,
  })

  useStore.getState().upsertTeamReport(mapTeamReport(created))
  useStore.getState().pushToast('گزارش روزانه برای سوپروایزر ارسال شد')
}

export async function performUpdateTeamReport(
  reportId: string,
  payload: {
    supervisorNotes?: string
    summary?: TeamReportSummary
  },
): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().updateTeamReport(reportId, payload)
    return
  }

  const updated = await http.patch<Dto>(`/team-reports/${reportId}`, {
    supervisor_notes: payload.supervisorNotes ?? null,
    summary: payload.summary ?? null,
  })

  useStore.getState().upsertTeamReport(mapTeamReport(updated))
  useStore.getState().pushToast('ویرایش گزارش ذخیره شد')
}

export async function performApproveTeamReport(reportId: string, supervisorNotes?: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().approveTeamReport(reportId, supervisorNotes)
    return
  }

  const updated = await http.post<Dto>(`/team-reports/${reportId}/approve`, {
    supervisor_notes: supervisorNotes ?? null,
  })

  useStore.getState().upsertTeamReport(mapTeamReport(updated))
}

export async function performForwardTeamReport(reportId: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().forwardTeamReport(reportId)
    return
  }

  const updated = await http.post<Dto>(`/team-reports/${reportId}/forward`)
  useStore.getState().upsertTeamReport(mapTeamReport(updated))
}
