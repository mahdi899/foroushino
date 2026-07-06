import type { Agent, Followup, Lead, Sale, SaleStage, Team } from '@/types'
import type { FunnelStage, Insight, SourcePerf, TeamRow } from '@/data/reports'
import { isOverdue, isToday } from './format'

const STAGE_ORDER: SaleStage[] = [
  'new',
  'first_call',
  'interested',
  'follow_up',
  'meeting',
  'payment_pending',
  'won',
]

export function computeFunnel(leads: Lead[]): FunnelStage[] {
  return STAGE_ORDER.map((stage) => ({
    stage,
    count: leads.filter((l) => l.stage === stage).length,
  }))
}

export function computeSourcePerf(leads: Lead[]): SourcePerf[] {
  const sources = Array.from(new Set(leads.map((l) => l.source)))
  return sources
    .map((source) => {
      const list = leads.filter((l) => l.source === source)
      const won = list.filter((l) => l.stage === 'won').length
      return {
        source,
        leads: list.length,
        conversion: list.length ? Math.round((won / list.length) * 100) : 0,
      }
    })
    .sort((a, b) => b.leads - a.leads)
}

export function computeTeamRows(agents: Agent[], teams: Team[]): TeamRow[] {
  return teams.map((t) => {
    const members = agents.filter((a) => a.teamId === t.id && a.role === 'agent')
    const calls = members.reduce((sum, a) => sum + a.callsToday, 0)
    const successful = members.reduce((sum, a) => sum + a.successfulToday, 0)
    const conversion = members.length
      ? Math.round(members.reduce((sum, a) => sum + a.conversionRate, 0) / members.length)
      : 0
    const orgAvg = agents.length
      ? Math.round(agents.reduce((sum, a) => sum + a.conversionRate, 0) / agents.length)
      : 0
    return { id: t.id, name: t.name, calls, successful, conversion, trend: conversion - orgAvg }
  })
}

export function weakAgents(agents: Agent[]): Agent[] {
  const pool = agents.filter((a) => a.role === 'agent' && a.callsToday >= 3)
  if (!pool.length) return []
  const avgConv = pool.reduce((sum, a) => sum + a.conversionRate, 0) / pool.length
  return pool
    .filter((a) => a.conversionRate < avgConv * 0.65)
    .sort((a, b) => b.callsToday - a.callsToday || a.conversionRate - b.conversionRate)
    .slice(0, 5)
}

export function suspiciousAgents(agents: Agent[]): Agent[] {
  return agents
    .filter((a) => a.role === 'agent' && a.callsToday >= 5 && a.conversionRate >= 65)
    .sort((a, b) => b.conversionRate - a.conversionRate)
}

export function overdueFollowupsList(followups: Followup[]): Followup[] {
  return followups
    .filter((f) => f.status !== 'done' && f.status !== 'cancelled' && !isToday(f.dueAt) && isOverdue(f.dueAt))
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
}

export function pendingConfirmationSales(sales: Sale[]): Sale[] {
  return sales.filter((s) => s.status === 'pending_confirmation')
}

export function computeManagerInsights(params: {
  teamRows: TeamRow[]
  sourcePerf: SourcePerf[]
  weak: Agent[]
  overdueCount: number
  pendingSales: number
}): Insight[] {
  const { teamRows, sourcePerf, weak, overdueCount, pendingSales } = params
  const insights: Insight[] = []

  const bestTeam = [...teamRows].sort((a, b) => b.conversion - a.conversion)[0]
  const worstTeam = [...teamRows].sort((a, b) => a.conversion - b.conversion)[0]
  if (bestTeam && worstTeam && bestTeam.id !== worstTeam.id) {
    insights.push({
      id: 'best-team',
      tone: 'positive',
      title: `عملکرد عالی ${bestTeam.name}`,
      body: `نرخ تبدیل ${bestTeam.conversion}٪ دارد، بالاترین بین تیم‌ها.`,
    })
    if (worstTeam.conversion < bestTeam.conversion - 5) {
      insights.push({
        id: 'worst-team',
        tone: 'warning',
        title: `افت ${worstTeam.name}`,
        body: `نرخ تبدیل این تیم ${worstTeam.conversion}٪ است، نیاز به بررسی کیفیت تماس دارد.`,
      })
    }
  }

  const bestSource = sourcePerf[0]
  if (bestSource) {
    insights.push({
      id: 'best-source',
      tone: 'info',
      title: 'منبع پربازده',
      body: `منبع با بیشترین حجم لید فعلاً فعال است؛ روی بودجه‌بندی آن تمرکز کن.`,
    })
  }

  if (pendingSales > 0) {
    insights.push({
      id: 'pending-sales',
      tone: 'warning',
      title: 'صف تایید فروش',
      body: `${pendingSales} فروش منتظر تایید نهایی توست.`,
    })
  }

  if (overdueCount > 0) {
    insights.push({
      id: 'overdue',
      tone: 'warning',
      title: 'پیگیری‌های عقب‌افتاده',
      body: `${overdueCount} پیگیری در کل تیم عقب افتاده است.`,
    })
  }

  if (weak.length > 0) {
    insights.push({
      id: 'weak-agents',
      tone: 'warning',
      title: 'کارشناسان نیازمند بررسی',
      body: `${weak.length} کارشناس تماس زیاد ولی نرخ تبدیل پایینی دارند.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      id: 'all-good',
      tone: 'positive',
      title: 'همه‌چیز مرتب است',
      body: 'در حال حاضر هشدار مهمی برای تیم ثبت نشده است.',
    })
  }

  return insights
}
