import { Crown, Phone, Star } from 'lucide-react'
import type { Agent } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

const rankConfig = {
  default: {
    1: { avatarSize: 56, stepHeight: 'h-[76px]', crown: true },
    2: { avatarSize: 48, stepHeight: 'h-[56px]', crown: false },
    3: { avatarSize: 44, stepHeight: 'h-[44px]', crown: false },
  },
  compact: {
    1: { avatarSize: 48, stepHeight: 'h-[58px]', crown: true },
    2: { avatarSize: 42, stepHeight: 'h-[46px]', crown: false },
    3: { avatarSize: 38, stepHeight: 'h-[38px]', crown: false },
  },
} as const

const rankStyle = {
  1: {
    step: 'border border-amber-400/30 bg-amber-400/12 dark:bg-amber-400/10',
    rankText: 'text-amber-600 dark:text-amber-400',
  },
  2: {
    step: 'border border-white/55 bg-white/30 dark:border-white/10 dark:bg-white/[0.06]',
    rankText: 'text-text-muted',
  },
  3: {
    step: 'border border-orange-400/25 bg-orange-400/10',
    rankText: 'text-orange-600 dark:text-orange-400',
  },
} as const

interface TeamPodiumProps {
  podium: Agent[]
  meId: string
  variant?: keyof typeof rankConfig
  embedded?: boolean
  metric?: 'daily' | 'monthly'
}

export function TeamPodium({
  podium,
  meId,
  variant = 'default',
  embedded = false,
  metric = 'monthly',
}: TeamPodiumProps) {
  const order = [1, 0, 2]
  const sizes = rankConfig[variant]

  const content = (
    <div className="flex items-end justify-center gap-2">
      {order.map((idx, pos) => {
        const agent = podium[idx]
        if (!agent) return <div key={pos} className="flex-1" />
        const rank = (idx + 1) as 1 | 2 | 3
        const cfg = sizes[rank]
        const style = rankStyle[rank]
        const isMe = agent.id === meId
        const pointsValue = metric === 'monthly' ? (agent.pointsThisMonth ?? 0) : agent.points
        const successValue =
          metric === 'monthly' ? (agent.successfulThisMonth ?? 0) : agent.successfulToday

        return (
          <div key={agent.id} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="relative mb-2 flex flex-col items-center">
              {cfg.crown && (
                <div className="mb-0.5">
                  <Crown
                    size={variant === 'compact' ? 14 : 17}
                    className="text-amber-500"
                    fill="currentColor"
                    strokeWidth={1.5}
                  />
                </div>
              )}
              <div className={cn('rounded-full', isMe && 'ring-2 ring-[#3390EC]/40 ring-offset-2 ring-offset-transparent')}>
                <Avatar
                  id={agent.id}
                  first={agent.firstName}
                  last={agent.lastName}
                  src={agent.avatar}
                  size={cfg.avatarSize}
                  ring
                />
              </div>
            </div>

            <p className="max-w-full truncate text-center text-[11px] font-bold text-text">
              {agent.firstName} {agent.lastName}
            </p>

            <div className="mt-1 flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  'glass-inset inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5',
                  'text-[9px] font-bold tabular-nums dark:border-white/10',
                  isMe ? 'border-[#3390EC]/25 text-[#3390EC] dark:border-[#8774E1]/28 dark:text-[#8774E1]' : 'border-white/55 text-text-soft',
                )}
              >
                <Star size={8} strokeWidth={2.5} />
                {toFa(pointsValue)}
              </span>
              {metric === 'daily' && (
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 text-[9px] font-semibold tabular-nums text-text-soft',
                  )}
                >
                  <Phone size={8} strokeWidth={2.5} />
                  {toFa(successValue)}
                </span>
              )}
            </div>

            <div className={cn('mt-2 w-full rounded-t-2xl backdrop-blur-sm', cfg.stepHeight, style.step)}>
              <div className="flex h-full items-center justify-center">
                <span className={cn('text-[24px] font-black tabular-nums leading-none', style.rankText)}>
                  {toFa(rank)}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )

  if (embedded) return content

  return (
    <div className="glass-card rounded-[24px] border border-white/55 p-4 pt-5 dark:border-white/10">
      {content}
    </div>
  )
}
