import type { Agent } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

interface LeaderboardRowProps {
  agent: Agent
  rank: number
  metric?: number
  metricLabel?: string
  highlight?: boolean
}

const rankStyles: Record<number, string> = {
  1: 'bg-warning-400 text-white',
  2: 'bg-neutral-300 text-white',
  3: 'bg-accent-400 text-white',
}

export function LeaderboardRow({
  agent,
  rank,
  metric,
  metricLabel = 'تماس',
  highlight,
}: LeaderboardRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl p-3 border',
        highlight
          ? 'bg-primary-50 border-primary-200'
          : 'bg-surface border-border/60 shadow-card',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold',
          rankStyles[rank] ?? 'bg-neutral-100 text-neutral-500',
        )}
      >
        {toFa(rank)}
      </span>
      <Avatar id={agent.id} first={agent.firstName} last={agent.lastName} src={agent.avatar} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-extrabold text-neutral-900">
          {agent.firstName} {agent.lastName}
          {highlight && <span className="mr-1 text-[11px] font-bold text-primary-600">(تو)</span>}
        </p>
        <p className="text-[11px] font-bold text-neutral-400">سطح {toFa(agent.level)}</p>
      </div>
      <div className="text-left">
        <p className="text-base font-extrabold text-primary-700 tabular-nums">
          {toFa(metric ?? agent.callsToday)}
        </p>
        <p className="text-[10px] font-bold text-neutral-400">{metricLabel}</p>
      </div>
    </div>
  )
}
