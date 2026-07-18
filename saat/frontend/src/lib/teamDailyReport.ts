import type {
  Agent,
  Commission,
  Team,
  TeamReport,
  TeamReportAgentEntry,
  TeamReportAgentMetrics,
  TeamReportSummary,
} from '@/types'
import { formatMoney, toFa } from '@/lib/format'

export function conversionRate(calls: number, successful: number): number {
  if (calls <= 0) return 0
  return Math.round((successful / calls) * 1000) / 10
}

const EMPTY_METRICS: TeamReportAgentMetrics = {
  calls_today: 0,
  successful_today: 0,
  conversion_rate: 0,
  commission_today: 0,
  shift_seconds: 0,
}

export const EMPTY_TEAM_REPORT_SUMMARY: TeamReportSummary = {
  calls_today: 0,
  successful_today: 0,
  conversion_rate: 0,
  pending_confirmation: 0,
  payment_submitted: 0,
  active_agents: 0,
  agents: [],
  narrative: null,
}

export function normalizeTeamReportSummary(raw: unknown): TeamReportSummary {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_TEAM_REPORT_SUMMARY }

  const row = raw as Record<string, unknown>
  return {
    calls_today: Number(row.calls_today ?? 0),
    successful_today: Number(row.successful_today ?? 0),
    conversion_rate: Number(row.conversion_rate ?? 0),
    pending_confirmation: Number(row.pending_confirmation ?? 0),
    payment_submitted: Number(row.payment_submitted ?? 0),
    active_agents: Number(row.active_agents ?? 0),
    agents: normalizeAgentEntries(row.agents),
    narrative: typeof row.narrative === 'string' ? row.narrative : null,
  }
}

export function normalizeTeamReport(report: TeamReport): TeamReport {
  return {
    ...report,
    summary: normalizeTeamReportSummary(report.summary),
  }
}

export function normalizeAgentEntry(raw: unknown): TeamReportAgentEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const agentId = String(row.agent_id ?? row.agentId ?? '')
  if (!agentId) return null

  const rawSource =
    row.source && typeof row.source === 'object'
      ? (row.source as Record<string, unknown>)
      : row

  const source: TeamReportAgentMetrics = {
    calls_today: Number(rawSource.calls_today ?? 0),
    successful_today: Number(rawSource.successful_today ?? 0),
    conversion_rate: Number(rawSource.conversion_rate ?? 0),
    commission_today: Number(rawSource.commission_today ?? 0),
    shift_seconds: Number(rawSource.shift_seconds ?? 0),
  }

  const display =
    row.display && typeof row.display === 'object'
      ? (row.display as TeamReportAgentEntry['display'])
      : undefined

  return {
    agent_id: agentId,
    agent_name: String(row.agent_name ?? row.agentName ?? 'کارشناس'),
    source,
    display,
    review_status:
      row.review_status === 'approved' || row.review_status === 'rejected'
        ? row.review_status
        : 'pending',
  }
}

export function normalizeAgentEntries(raw: unknown): TeamReportAgentEntry[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeAgentEntry).filter((row): row is TeamReportAgentEntry => row !== null)
}

export function effectiveAgentMetrics(entry: TeamReportAgentEntry): TeamReportAgentMetrics {
  return {
    ...EMPTY_METRICS,
    ...entry.source,
    ...entry.display,
  }
}

export function sortAgentEntries(entries: TeamReportAgentEntry[]): TeamReportAgentEntry[] {
  return normalizeAgentEntries(entries).sort((a, b) => {
    const rateDiff = effectiveAgentMetrics(b).conversion_rate - effectiveAgentMetrics(a).conversion_rate
    if (rateDiff !== 0) return rateDiff
    return effectiveAgentMetrics(b).calls_today - effectiveAgentMetrics(a).calls_today
  })
}

function commissionTodayForAgent(agentId: string, commissions: Commission[], reportDate: string): number {
  return commissions
    .filter((row) => row.agentId === agentId && row.createdAt.slice(0, 10) === reportDate)
    .reduce((sum, row) => sum + row.commissionAmount, 0)
}

function estimateShiftSeconds(agent: Agent): number {
  if (agent.shiftSecondsThisMonth && agent.shiftSecondsThisMonth > 0) {
    return Math.min(agent.shiftSecondsThisMonth, 8 * 3600)
  }
  return Math.max(agent.callsToday, 1) * 900
}

export function buildAgentEntry(
  agent: Agent,
  commissions: Commission[],
  reportDate: string,
): TeamReportAgentEntry {
  const calls = agent.callsToday
  const successful = agent.successfulToday
  const source: TeamReportAgentMetrics = {
    calls_today: calls,
    successful_today: successful,
    conversion_rate: conversionRate(calls, successful),
    commission_today: commissionTodayForAgent(agent.id, commissions, reportDate),
    shift_seconds: estimateShiftSeconds(agent),
  }

  return {
    agent_id: agent.id,
    agent_name: `${agent.firstName} ${agent.lastName}`.trim(),
    source,
    review_status: 'pending',
  }
}

export function buildTeamReportDraft(input: {
  team: Team
  agents: Agent[]
  commissions: Commission[]
  sales: { teamId: string; status: string }[]
  reportDate?: string
}): TeamReportSummary {
  const reportDate = input.reportDate ?? new Date().toISOString().slice(0, 10)
  const teamAgentIds = input.team.agentIds ?? []
  const members = input.agents.filter(
    (agent) => agent.role === 'agent' && teamAgentIds.includes(agent.id),
  )
  const agentEntries = sortAgentEntries(
    members.map((agent) => buildAgentEntry(agent, input.commissions, reportDate)),
  )

  const callsToday = agentEntries.reduce((sum, row) => sum + row.source.calls_today, 0)
  const successfulToday = agentEntries.reduce((sum, row) => sum + row.source.successful_today, 0)

  const summary: TeamReportSummary = {
    calls_today: callsToday,
    successful_today: successfulToday,
    conversion_rate: conversionRate(callsToday, successfulToday),
    pending_confirmation: input.sales.filter(
      (sale) => sale.teamId === input.team.id && sale.status === 'pending_confirmation',
    ).length,
    payment_submitted: input.sales.filter(
      (sale) => sale.teamId === input.team.id && sale.status === 'payment_submitted',
    ).length,
    active_agents: members.length,
    agents: agentEntries,
    narrative: buildTeamReportNarrative(agentEntries),
  }

  return summary
}

export function formatShiftHoursBrief(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  if (hours > 0 && minutes > 0) return `${toFa(hours)} ساعت و ${toFa(minutes)} دقیقه`
  if (hours > 0) return `${toFa(hours)} ساعت`
  if (minutes > 0) return `${toFa(minutes)} دقیقه`
  return `${toFa(0)} دقیقه`
}

export function formatAgentReportLine(entry: TeamReportAgentEntry): string {
  const metrics = effectiveAgentMetrics(entry)
  const parts = [
    `${entry.agent_name}: ${toFa(metrics.calls_today)} تماس`,
    `${formatMoney(metrics.commission_today)} تومان پورسانت`,
    `${formatShiftHoursBrief(metrics.shift_seconds)} شیفت`,
  ]
  if (metrics.successful_today > 0) {
    parts.splice(1, 0, `${toFa(metrics.successful_today)} موفق (${toFa(metrics.conversion_rate)}٪)`)
  } else {
    parts.splice(1, 0, `${toFa(metrics.conversion_rate)}٪ موفقیت`)
  }
  return parts.join(' · ')
}

export function buildTeamReportNarrative(entries: TeamReportAgentEntry[]): string {
  return sortAgentEntries(entries).map((entry) => formatAgentReportLine(entry)).join('\n')
}

export function exportTeamReportCsv(report: TeamReport): void {
  const agents = report.summary.agents ?? []
  const header = [
    'کارشناس',
    'تماس (اصلی)',
    'تماس (ویرایشی)',
    'موفق (اصلی)',
    'موفق (ویرایشی)',
    'درصد موفقیت (اصلی)',
    'درصد موفقیت (ویرایشی)',
    'پورسانت (اصلی)',
    'پورسانت (ویرایشی)',
    'شیفت ثانیه (اصلی)',
    'شیفت ثانیه (ویرایشی)',
    'وضعیت بررسی',
    'یادداشت',
  ]

  const rows = agents.map((entry) => {
    const edited = effectiveAgentMetrics(entry)
    const source = entry.source ?? EMPTY_METRICS
    return [
      entry.agent_name,
      source.calls_today,
      edited.calls_today,
      source.successful_today,
      edited.successful_today,
      source.conversion_rate,
      edited.conversion_rate,
      source.commission_today,
      edited.commission_today,
      source.shift_seconds,
      edited.shift_seconds,
      entry.review_status ?? 'pending',
      entry.display?.note ?? '',
    ]
  })

  const summaryRows = [
    [],
    ['خلاصه تیم', report.teamName],
    ['تاریخ', report.reportDate],
    ['تماس کل', report.summary.calls_today],
    ['موفق کل', report.summary.successful_today],
    ['نرخ تبدیل', `${report.summary.conversion_rate}%`],
    ['یادداشت لیدر', report.leaderNotes ?? ''],
    ['یادداشت ناظر', report.supervisorNotes ?? ''],
    ['متن خلاصه', report.summary.narrative ?? ''],
  ]

  const csvBody = [header, ...rows, ...summaryRows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvBody], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `team-report-${report.teamId}-${report.reportDate}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
