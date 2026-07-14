import { apiMode } from '@/services'
import { http } from '@/services/http'
import { syncAppData } from '@/services/sync'
import { useStore } from '@/store/useStore'

export async function performSubmitTeamReport(leaderNotes?: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().submitTeamReport(leaderNotes)
    return
  }

  const team = useStore.getState().teams.find(
    (row) => row.leaderId === useStore.getState().currentAgentId,
  )
  if (!team) throw new Error('تیمی برای ارسال گزارش پیدا نشد.')

  await http.post('/team-reports', {
    team_id: Number(team.id),
    report_date: new Date().toISOString().slice(0, 10),
    leader_notes: leaderNotes ?? null,
  })

  const payload = await syncAppData()
  useStore.getState().applySyncData(payload)
}

export async function performApproveTeamReport(reportId: string, supervisorNotes?: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().approveTeamReport(reportId, supervisorNotes)
    return
  }

  await http.post(`/team-reports/${reportId}/approve`, {
    supervisor_notes: supervisorNotes ?? null,
  })

  const payload = await syncAppData()
  useStore.getState().applySyncData(payload)
}

export async function performForwardTeamReport(reportId: string): Promise<void> {
  if (apiMode !== 'http') {
    useStore.getState().forwardTeamReport(reportId)
    return
  }

  await http.post(`/team-reports/${reportId}/forward`)

  const payload = await syncAppData()
  useStore.getState().applySyncData(payload)
}
