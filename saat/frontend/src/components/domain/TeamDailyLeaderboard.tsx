import { useMemo } from 'react'
import type { Agent, Team } from '@/types'
import { TeamPodium } from '@/components/domain/TeamPodium'
import { TeamRosterList } from '@/components/domain/TeamRosterList'
import { getTeamRosterView } from '@/lib/teamRoster'
import { cn } from '@/lib/cn'

interface TeamDailyLeaderboardProps {
  peers: Agent[]
  meId: string
  team?: Team | null
  agents?: Agent[]
  variant?: 'default' | 'compact'
  embedded?: boolean
  className?: string
}

export function TeamDailyLeaderboard({
  peers,
  meId,
  team,
  agents = [],
  variant = 'default',
  embedded = false,
  className,
}: TeamDailyLeaderboardProps) {
  const podium = peers.slice(0, 3)
  const roster = useMemo(() => getTeamRosterView(team, agents), [team, agents])

  if (peers.length === 0 && roster.agents.length === 0 && !roster.supervisor && !roster.leader) {
    return null
  }

  const body = (
    <>
      {podium.length > 0 && (
        <TeamPodium podium={podium} meId={meId} variant={variant} embedded />
      )}
      <TeamRosterList
        roster={roster}
        meId={meId}
        maxHeightClass={variant === 'compact' ? 'max-h-[240px]' : 'max-h-[320px]'}
      />
    </>
  )

  if (embedded) {
    return <div className={className}>{body}</div>
  }

  return (
    <div className={cn('glass-card rounded-[24px] border border-white/55 p-4 pt-5 dark:border-white/10', className)}>
      {body}
    </div>
  )
}
