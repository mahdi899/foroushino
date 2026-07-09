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
  shell: string
  overlay: string
  glow: string
  shadow: string
  progressFill: string
  stepAccent: string
}

/** Pipeline journey: Teal (start) → Gold (mid) → Orange (close) → Success (won) */
const harmonySteps: StageTheme[] = [
  {
    shell: 'border-primary-400/40 bg-gradient-to-br from-primary-800 via-primary-600 to-primary-500',
    overlay: 'from-primary-900/35 via-transparent to-primary-300/15',
    glow: 'bg-primary-300/25',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,111,117,0.42)]',
    progressFill: 'bg-gradient-to-l from-primary-200 via-white to-primary-100',
    stepAccent: 'text-primary-600',
  },
  {
    shell: 'border-primary-500/45 bg-gradient-to-br from-primary-900 via-primary-700 to-primary-600',
    overlay: 'from-primary-900/40 via-primary-600/10 to-primary-400/10',
    glow: 'bg-primary-400/20',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,91,97,0.48)]',
    progressFill: 'bg-gradient-to-l from-primary-200 via-white to-primary-100',
    stepAccent: 'text-primary-600',
  },
  {
    shell: 'border-primary-500/50 bg-gradient-to-br from-[#003B40] via-primary-700 to-primary-500',
    overlay: 'from-secondary-500/18 via-transparent to-primary-400/12',
    glow: 'bg-secondary-400/18',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,91,97,0.5)]',
    progressFill: 'bg-gradient-to-l from-secondary-200 via-white to-primary-100',
    stepAccent: 'text-primary-700',
  },
  {
    shell: 'border-secondary-500/35 bg-gradient-to-br from-primary-900 via-[#00484D] to-primary-600',
    overlay: 'from-secondary-500/22 via-primary-700/10 to-transparent',
    glow: 'bg-secondary-400/22',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(0,72,77,0.52)]',
    progressFill: 'bg-gradient-to-l from-secondary-200 via-white to-primary-100',
    stepAccent: 'text-secondary-600',
  },
  {
    shell: 'border-secondary-400/45 bg-gradient-to-br from-primary-900 via-[#00484D] to-secondary-600',
    overlay: 'from-secondary-400/28 via-transparent to-primary-500/10',
    glow: 'bg-secondary-300/25',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(255,176,0,0.22)]',
    progressFill: 'bg-gradient-to-l from-secondary-200 via-white to-secondary-100',
    stepAccent: 'text-secondary-600',
  },
  {
    shell: 'border-accent-400/40 bg-gradient-to-br from-secondary-700 via-accent-600 to-accent-500',
    overlay: 'from-white/12 via-accent-500/10 to-secondary-400/15',
    glow: 'bg-accent-400/22',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(255,107,0,0.32)]',
    progressFill: 'bg-gradient-to-l from-white via-secondary-100 to-white',
    stepAccent: 'text-accent-600',
  },
  {
    shell: 'border-success-400/45 bg-gradient-to-br from-success-800 via-success-600 to-primary-600',
    overlay: 'from-secondary-400/20 via-success-500/15 to-primary-500/10',
    glow: 'bg-success-300/25',
    shadow: 'shadow-[0_10px_30px_-12px_rgba(16,163,127,0.45)]',
    progressFill: 'bg-gradient-to-l from-success-200 via-white to-secondary-100',
    stepAccent: 'text-success-600',
  },
]

function stageThemeAt(index: number): StageTheme {
  return harmonySteps[Math.min(index, harmonySteps.length - 1)]
}

export function StageBar({ stage }: { stage: SaleStage }) {
  const [expanded, setExpanded] = useState(false)

  if (stage === 'lost') {
    return (
      <div className="glass-inset rounded-[22px] border border-error-200/60 px-4 py-3 text-center text-sm font-bold text-error-600 dark:border-error-500/25">
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
  const isClosing = currentIndex >= 5

  return (
    <motion.div
      key={currentStage}
      initial={{ opacity: 0.88, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'stage-pipeline-card relative isolate overflow-hidden rounded-[26px] border border-white/30 p-4 text-white dark:border-white/10',
        theme.shell,
        theme.shadow,
      )}
    >
      <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80', theme.overlay)} />
      <div
        className={cn(
          'pointer-events-none absolute -start-10 -top-10 h-32 w-32 rounded-full blur-3xl',
          theme.glow,
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute -bottom-12 -end-8 h-28 w-28 rounded-full blur-3xl',
          isClosing ? 'bg-accent-400/15' : 'bg-white/8',
        )}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

      <div className="relative space-y-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-md backdrop-blur-md',
              isClosing ? 'text-white' : 'text-white',
            )}
          >
            {isWon ? <Check size={22} strokeWidth={2.5} /> : <Icon size={20} strokeWidth={2.5} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-white/75">مرحله فعلی</p>
            <p className="mt-0.5 truncate text-[16px] font-extrabold leading-6 text-white">
              {stageLabels[currentStage]}
            </p>
          </div>
          {isClosing && !isWon && (
            <span className="shrink-0 rounded-full border border-white/30 bg-white/18 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md">
              نزدیک فروش
            </span>
          )}
          {isWon && (
            <span className="shrink-0 rounded-full border border-white/30 bg-white/18 px-2.5 py-1 text-[10px] font-bold backdrop-blur-md">
              🎉 موفق
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-2.5 rounded-2xl border border-white/25 bg-black/10 px-3 py-2.5 backdrop-blur-md"
          dir="ltr"
        >
          <span className="shrink-0 text-[11px] font-extrabold tabular-nums text-white/85">
            {toFa(currentIndex + 1)}/{toFa(total)}
          </span>
          <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={cn('h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.35)]', theme.progressFill)}
            />
          </div>
          <span className="shrink-0 text-[13px] font-extrabold tabular-nums text-white">
            {toFa(progress)}٪
          </span>
        </div>

        <div className="flex items-center gap-2 border-t border-white/20 pt-3 text-[11px] font-bold">
          {nextStage ? (
            <p className="min-w-0 flex-1 truncate text-white/80">
              مرحله بعد:{' '}
              <span className="text-white">{stageLabels[nextStage]}</span>
            </p>
          ) : (
            <span className="flex-1" />
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex shrink-0 items-center gap-1 whitespace-nowrap text-white/90 transition-opacity active:opacity-70"
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
                  const stepTheme = stageThemeAt(i)
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
                          done && stepTheme.stepAccent,
                          active && cn(stepTheme.stepAccent, 'ring-4 ring-white/30'),
                          !done && !active && 'bg-white/75 text-neutral-400',
                        )}
                      >
                        {done ? (
                          <Check size={14} strokeWidth={2.5} className={stepTheme.stepAccent} />
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
