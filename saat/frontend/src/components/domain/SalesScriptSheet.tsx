import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronUp, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'
import { salesScript } from '@/data/mock'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

interface SalesScriptSheetProps {
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  fill?: boolean
  /** Inline body only — for use inside another panel (e.g. dialer guide). */
  embedded?: boolean
}

export function SalesScriptSheet({
  expanded: controlledExpanded,
  onExpandedChange,
  fill = false,
  embedded = false,
}: SalesScriptSheetProps = {}) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const expanded = controlledExpanded ?? internalExpanded
  const [step, setStep] = useState(0)
  const current = salesScript[step]

  const setExpanded = (value: boolean | ((prev: boolean) => boolean)) => {
    const next = typeof value === 'function' ? value(expanded) : value
    if (controlledExpanded === undefined) setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  const scriptBody = (
    <>
      <div
        className={cn(
          embedded ? 'px-0 pt-0' : 'px-5 pt-4',
          fill && !embedded ? 'min-h-0 flex-1 overflow-y-auto no-scrollbar' : '',
          !fill && !embedded ? 'max-h-56 overflow-y-auto no-scrollbar' : '',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl bg-primary-50/60 p-4 dark:bg-primary-500/10"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-[13px] font-extrabold text-primary-800 dark:text-primary-200">
                {toFa(step + 1)}. {current.title}
              </h4>
              <Volume2 size={16} className="text-primary-500" />
            </div>
            <p className="text-[13px] leading-7 text-neutral-700 dark:text-neutral-300">{current.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div
        className={cn(
          'flex shrink-0 items-center justify-between py-3',
          embedded ? 'px-0' : 'border-t border-border/60 px-5',
        )}
      >
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 disabled:opacity-40 dark:bg-white/8"
        >
          <ChevronRight size={18} />
        </button>
        <div className="flex gap-1.5">
          {salesScript.map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-5 bg-primary-500' : 'w-1.5 bg-neutral-200 dark:bg-white/15',
              )}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(salesScript.length - 1, s + 1))}
          disabled={step === salesScript.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 disabled:opacity-40 dark:bg-white/8"
        >
          <ChevronLeft size={18} />
        </button>
      </div>
    </>
  )

  if (embedded) {
    return <div className="space-y-1">{scriptBody}</div>
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-t-[24px] bg-surface shadow-[0_-8px_30px_-12px_rgba(11,31,34,0.2)]',
        expanded && 'shadow-[0_-16px_40px_-12px_rgba(11,31,34,0.28)]',
        fill && expanded && 'flex min-h-0 flex-1 flex-col',
      )}
    >
      {expanded && scriptBody}

      {expanded ? (
        <div
          className={cn(
            'flex h-16 w-full shrink-0 items-center justify-between border-t border-border/60 px-5',
          )}
        >
          <span className="flex items-center gap-2 text-sm font-extrabold text-neutral-900">
            <BookOpen size={17} className="text-primary-600" />
            اسکریپت فروش
            <span className="text-xs font-bold text-neutral-400">
              {toFa(step + 1)}/{toFa(salesScript.length)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-xl bg-neutral-100 px-4 py-2 text-xs font-extrabold text-neutral-600 active:bg-neutral-200"
          >
            بستن
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex h-16 w-full shrink-0 items-center justify-between px-5"
        >
          <span className="flex items-center gap-2 text-sm font-extrabold text-neutral-900">
            <BookOpen size={17} className="text-primary-600" />
            اسکریپت فروش
          </span>
          <span className="flex items-center gap-2 text-xs font-bold text-neutral-400">
            {toFa(step + 1)}/{toFa(salesScript.length)}
            <ChevronUp size={18} />
          </span>
        </button>
      )}
    </div>
  )
}
