import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronDown,
  Trophy,
  Phone,
  Heart,
  Repeat2,
  Calendar,
  Wallet,
  UserPlus,
} from 'lucide-react'
import type { SaleStage } from '@/types'
import { stageLabels, stageOrder } from '@/data/labels'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

type PipelineStage = Exclude<SaleStage, 'lost'>

const stageIcons: Record<PipelineStage, typeof UserPlus> = {
  new: UserPlus,
  first_call: Phone,
  interested: Heart,
  follow_up: Repeat2,
  meeting: Calendar,
  payment_pending: Wallet,
  won: Trophy,
}

type StageTheme = {
  card: string
  cardBorder: string
  cardGradient: string
  shadow: string
}

/** Dark brand ramp — white text, readable contrast */
const harmonySteps: StageTheme[] = [
  {
    card: 'bg-primary-500',
    cardBorder: 'border-primary-400',
    cardGradient: 'from-primary-700/50 via-primary-600/30 to-primary-500',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,111,117,0.5)]',
  },
  {
    card: 'bg-primary-600',
    cardBorder: 'border-primary-500',
    cardGradient: 'from-primary-800/45 via-primary-700/25 to-primary-600',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,111,117,0.52)]',
  },
  {
    card: 'bg-primary-600',
    cardBorder: 'border-primary-500',
    cardGradient: 'from-primary-800/50 via-primary-700/30 to-primary-600',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,91,97,0.55)]',
  },
  {
    card: 'bg-primary-700',
    cardBorder: 'border-primary-600',
    cardGradient: 'from-primary-900/40 via-primary-800/30 to-primary-700',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,91,97,0.58)]',
  },
  {
    card: 'bg-primary-700',
    cardBorder: 'border-primary-600',
    cardGradient: 'from-primary-900/45 via-primary-800/35 to-primary-700',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,72,77,0.6)]',
  },
  {
    card: 'bg-primary-800',
    cardBorder: 'border-primary-700',
    cardGradient: 'from-primary-900/55 via-primary-800/40 to-primary-800',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,72,77,0.62)]',
  },
  {
    card: 'bg-success-600',
    cardBorder: 'border-success-500',
    cardGradient: 'from-success-800/50 via-success-700/35 to-success-600',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(16,163,127,0.5)]',
  },
]

function stageThemeAt(index: number): StageTheme {
  return harmonySteps[Math.min(index, harmonySteps.length - 1)]
}

export function StageBar({ stage }: { stage: SaleStage }) {
  const [expanded, setExpanded] = useState(false)

  if (stage === 'lost') {
    return (
      <div className="rounded-3xl border border-error-200 bg-error-600 px-4 py-3 text-center text-sm font-bold text-white shadow-[0_10px_30px_-12px_rgba(201,54,59,0.45)]">
        {stageLabels.lost}
      </div>
    )
  }

  const currentIndex = stageOrder.indexOf(stage)
  const total = stageOrder.length
  const progress = Math.round(((currentIndex + 1) / total) * 100)
  const currentStage = stageOrder[currentIndex] as PipelineStage
  const nextStage = currentIndex < total - 1 ? (stageOrder[currentIndex + 1] as PipelineStage) : null
  const theme = stageThemeAt(currentIndex)
  const Icon = stageIcons[currentStage]
  const isWon = stage === 'won'

  return (
    <motion.div
      key={currentStage}
      initial={{ opacity: 0.85 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative overflow-hidden rounded-3xl border p-4 text-white',
        theme.card,
        theme.cardBorder,
        theme.shadow,
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 bg-gradient-to-l',
          theme.cardGradient,
        )}
      />

      <div className="relative space-y-3">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white shadow-md ring-4 ring-white/25">
            {isWon ? <Check size={24} strokeWidth={2.5} /> : <Icon size={22} strokeWidth={2.5} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white/70">مرحله فعلی</p>
            <p className="mt-0.5 truncate text-[17px] font-extrabold leading-6 text-white">
              {stageLabels[currentStage]}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5">
          <span className="shrink-0 text-[11px] font-extrabold tabular-nums text-white/80">
            {toFa(currentIndex + 1)}/{toFa(total)}
          </span>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full rounded-full bg-white"
            />
          </div>
          <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-white">
            {toFa(progress)}٪
          </span>
        </div>

        <div
          className={cn(
            'flex items-center gap-2 border-t border-white/20 pt-3 text-[11px] font-bold',
            nextStage ? 'justify-between' : 'justify-end',
          )}
        >
          {nextStage && (
            <p className="min-w-0 truncate text-white/75">
              مرحله بعد:{' '}
              <span className="text-white">{stageLabels[nextStage]}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex shrink-0 items-center gap-1 text-white/75 transition-opacity active:opacity-70"
          >
            {expanded ? 'بستن جزئیات' : 'نمایش همه مراحل'}
            <ChevronDown size={14} className={cn('transition-transform duration-200', expanded && 'rotate-180')} />
          </button>
        </div>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {stageOrder.map((s, i) => {
                  const done = i < currentIndex
                  const active = i === currentIndex
                  return (
                    <div
                      key={s}
                      className={cn(
                        'flex w-[84px] shrink-0 flex-col items-center gap-2 rounded-2xl border px-2 py-3',
                        active && 'border-white/50 bg-white/20',
                        done && !active && 'border-white/30 bg-white/10',
                        !done && !active && 'border-white/15 bg-white/5 opacity-70',
                      )}
                    >
                      <div
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-full bg-white text-[11px] font-extrabold',
                          done && 'text-primary-600',
                          active && 'text-primary-700 ring-4 ring-white/30',
                          !done && !active && 'bg-white/75 text-primary-400',
                        )}
                      >
                        {done ? (
                          <Check size={14} strokeWidth={2.5} className="text-primary-600" />
                        ) : (
                          toFa(i + 1)
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-center text-[10px] font-bold leading-[14px]',
                          active && 'text-white',
                          done && !active && 'text-white/85',
                          !done && !active && 'text-white/45',
                        )}
                      >
                        {stageLabels[s]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
