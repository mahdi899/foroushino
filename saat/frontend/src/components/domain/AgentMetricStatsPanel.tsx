import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { MetricStatGrid } from '@/components/domain/MetricStatGrid'
import { AgentMetricDetailSheet } from '@/components/domain/AgentMetricDetailSheet'
import { conversionRateFromStats } from '@/lib/dailyGoal'
import { filterFollowupsForAgent, filterLeadsForAgent, overdueFollowups } from '@/lib/leadUtils'
import {
  buildAgentSelfCallsItems,
  buildAgentSelfConversionItems,
  buildAgentSelfHotLeadItems,
  buildAgentSelfOverdueItems,
  type TeamMetricKind,
} from '@/lib/teamMetricBreakdown'
import { cn } from '@/lib/cn'

type AgentMetricStatsPanelProps = {
  agentId: string
  className?: string
  embedded?: boolean
}

export function AgentMetricStatsPanel({ agentId, className, embedded = false }: AgentMetricStatsPanelProps) {
  const leads = useStore((s) => s.leads)
  const followups = useStore((s) => s.followups)
  const agent = useStore((s) => s.agents.find((row) => row.id === agentId))
  const [metricSheet, setMetricSheet] = useState<TeamMetricKind | null>(null)

  const agentLeads = useMemo(() => filterLeadsForAgent(leads, agentId), [leads, agentId])
  const agentFollowups = useMemo(
    () => filterFollowupsForAgent(followups, leads, agentId),
    [followups, leads, agentId],
  )

  const totalCalls = agent?.callsToday ?? 0
  const conversion = agent
    ? agent.conversionRate > 0
      ? agent.conversionRate
      : conversionRateFromStats(agent.callsToday, agent.successfulToday)
    : 0
  const hotLeads = agentLeads.filter((lead) => lead.temperature === 'hot').length
  const overdueCount = overdueFollowups(agentFollowups).length

  const sheetItems = useMemo(() => {
    if (!metricSheet || !agent) return []
    switch (metricSheet) {
      case 'calls':
        return buildAgentSelfCallsItems(agent)
      case 'conversion':
        return buildAgentSelfConversionItems(agent)
      case 'hot_leads':
        return buildAgentSelfHotLeadItems(agentLeads)
      case 'overdue':
        return buildAgentSelfOverdueItems(agentFollowups, leads)
      default:
        return []
    }
  }, [metricSheet, agent, agentLeads, agentFollowups, leads])

  const grid = (
    <MetricStatGrid
      totalCalls={totalCalls}
      conversion={conversion}
      hotLeads={hotLeads}
      overdueCount={overdueCount}
      onMetricClick={setMetricSheet}
    />
  )

  return (
    <>
      {embedded ? (
        <div
          className={cn(
            'glass-card overflow-hidden rounded-[22px] border border-white/55 p-4 dark:border-white/10',
            className,
          )}
        >
          {grid}
        </div>
      ) : (
        <div
          className={cn(
            'glass-card overflow-hidden rounded-[22px] border border-white/55 p-4 dark:border-white/10',
            className,
          )}
        >
          <p className="mb-3 text-[12px] font-bold text-text-soft">خلاصه امروز</p>
          {grid}
        </div>
      )}

      <AgentMetricDetailSheet
        open={metricSheet != null}
        kind={metricSheet}
        items={sheetItems}
        onClose={() => setMetricSheet(null)}
      />
    </>
  )
}
