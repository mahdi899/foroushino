import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import type { CallResult } from '@/types'
import { resultIcon, resultTone } from './icons'
import { resultLabels } from '@/data/labels'
import { cn } from '@/lib/cn'

const toneBg: Record<string, string> = {
  hot: 'bg-hot-50 text-hot-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  primary: 'bg-primary-50 text-primary-600',
  secondary: 'bg-secondary-50 text-secondary-600',
  accent: 'bg-accent-50 text-accent-600',
  error: 'bg-error-50 text-error-600',
  cold: 'bg-cold-50 text-cold-600',
  neutral: 'bg-neutral-100 text-neutral-500',
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
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-3 transition-colors',
        selected ? 'border-primary-500 bg-primary-50/60' : 'border-border bg-surface',
      )}
    >
      {selected && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white ring-2 ring-surface">
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      <span className={cn('flex h-11 w-11 items-center justify-center rounded-2xl', toneBg[tone])}>
        <Icon size={22} />
      </span>
      <span className="text-center text-[11px] font-extrabold leading-3 text-neutral-700">
        {resultLabels[result]}
      </span>
    </motion.button>
  )
}
