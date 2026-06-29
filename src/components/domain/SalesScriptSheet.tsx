import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, ChevronUp, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react'
import { salesScript } from '@/data/mock'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

export function SalesScriptSheet() {
  const [expanded, setExpanded] = useState(false)
  const [step, setStep] = useState(0)
  const current = salesScript[step]

  return (
    <motion.div
      initial={false}
      animate={{ height: expanded ? 'auto' : 64 }}
      className="overflow-hidden rounded-t-[24px] bg-surface shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.2)]"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex h-16 w-full items-center justify-between px-5"
      >
        <span className="flex items-center gap-2 text-sm font-extrabold text-neutral-900">
          <BookOpen size={17} className="text-primary-600" />
          اسکریپت فروش
        </span>
        <span className="flex items-center gap-2 text-xs font-bold text-neutral-400">
          {toFa(step + 1)}/{toFa(salesScript.length)}
          <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
            <ChevronUp size={18} />
          </motion.span>
        </span>
      </button>

      <div className="px-5 pb-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className="rounded-2xl bg-primary-50/60 p-4"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <h4 className="text-[13px] font-extrabold text-primary-800">
                {toFa(step + 1)}. {current.title}
              </h4>
              <Volume2 size={16} className="text-primary-500" />
            </div>
            <p className="text-[13px] leading-7 text-neutral-700">{current.body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 disabled:opacity-40"
          >
            <ChevronRight size={18} />
          </button>
          <div className="flex gap-1.5">
            {salesScript.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === step ? 'w-5 bg-primary-500' : 'w-1.5 bg-neutral-200',
                )}
              />
            ))}
          </div>
          <button
            onClick={() => setStep((s) => Math.min(salesScript.length - 1, s + 1))}
            disabled={step === salesScript.length - 1}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-neutral-500 disabled:opacity-40"
          >
            <ChevronLeft size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
