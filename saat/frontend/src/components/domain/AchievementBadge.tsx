import type { Achievement } from '@/types'
import { achievementIcon } from './icons'
import { cn } from '@/lib/cn'

const colorMap: Record<string, string> = {
  hot: 'from-hot-500 to-hot-600',
  accent: 'from-accent-400 to-accent-600',
  primary: 'from-primary-500 to-primary-700',
  secondary: 'from-secondary-400 to-secondary-600',
  cold: 'from-cold-400 to-cold-600',
}

interface AchievementBadgeProps {
  ach: Achievement
  onClick?: () => void
}

export function AchievementBadge({ ach, onClick }: AchievementBadgeProps) {
  const Icon = achievementIcon[ach.icon] ?? achievementIcon.target

  const content = (
    <>
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl text-white',
          ach.unlocked
            ? `bg-gradient-to-br ${colorMap[ach.color] ?? colorMap.primary} shadow-soft`
            : 'bg-neutral-100 text-neutral-300',
        )}
      >
        <Icon size={24} />
      </div>
      <span
        className={cn(
          'line-clamp-2 text-[10px] font-extrabold leading-tight',
          ach.unlocked ? 'text-neutral-700' : 'text-neutral-400',
        )}
      >
        {ach.title}
      </span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center transition-transform active:scale-95"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center">
      {content}
    </div>
  )
}

export function AchievementBadgeIcon({ ach, size = 'lg' }: { ach: Achievement; size?: 'lg' | 'md' }) {
  const Icon = achievementIcon[ach.icon] ?? achievementIcon.target
  const box = size === 'lg' ? 'h-20 w-20 rounded-[22px]' : 'h-14 w-14 rounded-2xl'

  return (
    <div
      className={cn(
        'flex items-center justify-center text-white',
        box,
        ach.unlocked
          ? `bg-gradient-to-br ${colorMap[ach.color] ?? colorMap.primary} shadow-soft`
          : 'bg-neutral-100 text-neutral-300',
      )}
    >
      <Icon size={size === 'lg' ? 36 : 24} />
    </div>
  )
}
