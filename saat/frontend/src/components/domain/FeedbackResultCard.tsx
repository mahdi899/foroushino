import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { CallResult } from '@/types'
import { resultIcon, resultTone } from './icons'
import { resultLabels } from '@/data/labels'
import { cn } from '@/lib/cn'

const toneBg: Record<string, string> = {
  hot: 'bg-hot-50 text-hot-600 dark:bg-hot-500/15',
  success: 'bg-success-50 text-success-600 dark:bg-success-500/15',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15',
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-500/15',
  secondary: 'bg-secondary-50 text-secondary-600 dark:bg-secondary-500/15',
  accent: 'bg-accent-50 text-accent-600 dark:bg-accent-500/15',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/15',
  cold: 'bg-cold-50 text-cold-600 dark:bg-cold-500/15',
  neutral: 'bg-neutral-100 text-neutral-500 dark:bg-white/10',
}

export function FeedbackResultCard({
  result,
  selected,
  onClick,
}: {
  result: CallResult
  selected: boolean
  onClick: () => void
}) {
  const Icon = resultIcon[result]
  const tone = resultTone[result]

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={cn(
        'relative flex h-full w-full min-w-0 flex-col items-center justify-center gap-1.5',
        'rounded-[16px] border px-2 py-2.5 min-h-[88px]',
        selected
          ? 'glass-inset border-[#3390EC]/35 bg-[#3390EC]/10 dark:border-[#8774E1]/35 dark:bg-[#8774E1]/12'
          : 'glass-card border-white/55 dark:border-white/10',
      )}
    >
      {selected && (
        <span className="absolute -top-1.5 -left-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#3390EC] text-white ring-2 ring-background dark:bg-[#8774E1]">
          <Check size={11} strokeWidth={3} />
        </span>
      )}
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          toneBg[tone],
        )}
      >
        <Icon size={18} strokeWidth={2.25} />
      </span>
      <span className="line-clamp-3 w-full text-center text-[11px] font-bold leading-[1.35] text-text">
        {resultLabels[result]}
      </span>
    </motion.button>
  )
}
