import type { Agent } from '@/types'
import { LeaderboardRow } from '@/components/domain/LeaderboardRow'
import { TeamPodium } from '@/components/domain/TeamPodium'
import { cn } from '@/lib/cn'

interface TeamDailyLeaderboardProps {
  peers: Agent[]
  meId: string
  variant?: 'default' | 'compact'
  embedded?: boolean
  className?: string
}

export function TeamDailyLeaderboard({
  peers,
  meId,
  variant = 'default',
  embedded = false,
  className,
}: TeamDailyLeaderboardProps) {
  const podium = peers.slice(0, 3)
  const rest = peers.slice(3)

  if (peers.length === 0) return null

  return (
    <div className={className}>
      {podium.length > 0 && (
        <TeamPodium podium={podium} meId={meId} variant={variant} embedded={embedded} />
      )}
      {rest.length > 0 && (
        <div className={cn(podium.length > 0 && 'mt-3', 'space-y-2')}>
          {rest.map((member, index) => (
            <LeaderboardRow
              key={member.id}
              agent={member}
              rank={index + 4}
              highlight={member.id === meId}
              metric={member.successfulToday}
              metricLabel="موفق"
            />
          ))}
        </div>
      )}
    </div>
  )
}
