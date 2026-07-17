import { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { getDailyTopPerformerRank, type DailyTopRank } from '@/lib/dailyTopPerformers'

export function useDailyTopRank(agentId?: string): DailyTopRank | null {
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const role = useStore((s) => s.role)
  const resolvedId = agentId ?? currentAgentId

  return useMemo(
    () => getDailyTopPerformerRank(resolvedId, agents, teams, currentAgentId, role),
    [resolvedId, agents, teams, currentAgentId, role],
  )
}
