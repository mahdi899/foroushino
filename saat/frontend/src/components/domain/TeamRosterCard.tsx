import { useMemo } from 'react'
import type { Agent, Team } from '@/types'
import { TeamRosterList } from '@/components/domain/TeamRosterList'
import { getTeamRosterView } from '@/lib/teamRoster'
import { cn } from '@/lib/cn'

type TeamRosterCardProps = {
  team: Team | null
  agents: Agent[]
  meId: string
  className?: string
}

export function TeamRosterCard({ team, agents, meId, className }: TeamRosterCardProps) {
  const roster = useMemo(() => getTeamRosterView(team, agents), [team, agents])

  const hasContent =
    roster.supervisor != null || roster.leader != null || roster.agents.length > 0

  if (!hasContent) return null

  return (
    <div
      className={cn(
        'glass-card overflow-hidden rounded-[22px] border border-white/55 p-4 dark:border-white/10',
        className,
      )}
    >
      <p className="mb-1 text-[12px] font-bold text-text-soft">{team?.name ?? 'تیم من'}</p>
      <p className="mb-3 text-[11px] font-medium text-text-soft">
        ناظر، سرتیم و کارشناسان تیم
      </p>
      <TeamRosterList roster={roster} meId={meId} className="mt-0 border-t-0 pt-0" />
    </div>
  )
}
