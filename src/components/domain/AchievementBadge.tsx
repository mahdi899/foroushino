import { motion } from 'framer-motion'
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

export function AchievementBadge({ ach, index = 0 }: { ach: Achievement; index?: number }) {
  const Icon = achievementIcon[ach.icon] ?? achievementIcon.target
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 260, damping: 18 }}
      className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center"
    >
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
      <span className={cn('text-[10px] font-extrabold leading-3', ach.unlocked ? 'text-neutral-700' : 'text-neutral-400')}>
        {ach.title}
      </span>
      <span className="text-[9px] font-bold text-neutral-400 leading-3">{ach.description}</span>
    </motion.div>
  )
}
