import { useState } from 'react'
import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion'
import { PhoneOff, ThumbsUp, X, CalendarClock } from 'lucide-react'
import type { CallResult } from '@/types'
import { resultHint } from '@/data/labels'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const swipeResults: Array<{
  result: CallResult
  label: string
  hint: string
  icon: typeof ThumbsUp
  tone: string
  direction: 'left' | 'right' | 'up'
}> = [
  {
    result: 'no_answer',
    label: 'جواب نداد',
    hint: resultHint.no_answer ?? '',
    icon: PhoneOff,
    tone: 'from-slate-500/20 to-slate-600/10 text-slate-700',
    direction: 'left',
  },
  {
    result: 'interested',
    label: 'علاقه‌مند',
    hint: resultHint.interested ?? '',
    icon: ThumbsUp,
    tone: 'from-emerald-500/20 to-emerald-600/10 text-emerald-700',
    direction: 'right',
  },
  {
    result: 'wrong_number',
    label: 'شماره اشتباه',
    hint: resultHint.wrong_number ?? '',
    icon: X,
    tone: 'from-red-500/20 to-red-600/10 text-red-700',
    direction: 'up',
  },
  {
    result: 'needs_followup',
    label: 'نیاز به پیگیری',
    hint: resultHint.needs_followup ?? '',
    icon: CalendarClock,
    tone: 'from-[#3390EC]/20 to-[#3390EC]/10 text-[#3390EC] dark:text-[#8774E1]',
    direction: 'up',
  },
]

export function SwipeDispositionDeck({
  onSelect,
  disabled,
}: {
  onSelect: (result: CallResult) => void
  disabled?: boolean
}) {
  const [index, setIndex] = useState(0)
  const card = swipeResults[index % swipeResults.length]
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-180, 180], [-12, 12])
  const opacity = useTransform(x, [-140, 0, 140], [0.35, 1, 0.35])

  const commit = (result: CallResult) => {
    haptic('success')
    onSelect(result)
    setIndex((value) => value + 1)
    x.set(0)
    y.set(0)
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (disabled) return
    const { offset, velocity } = info
    if (offset.x < -80 || velocity.x < -500) {
      commit('no_answer')
      return
    }
    if (offset.x > 80 || velocity.x > 500) {
      commit('interested')
      return
    }
    if (offset.y < -80 || velocity.y < -500) {
      commit(index % 2 === 0 ? 'wrong_number' : 'needs_followup')
    }
  }

  const Icon = card.icon

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1 text-[11px] font-bold text-text-soft">
        <span>چپ: جواب نداد</span>
        <span>بالا: اشتباه / پیگیری</span>
        <span>راست: علاقه‌مند</span>
      </div>
      <motion.div
        key={card.result + index}
        style={{ x, y, rotate, opacity }}
        drag={disabled ? false : true}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragEnd={onDragEnd}
        className={cn(
          'glass-card relative min-h-[220px] cursor-grab rounded-[28px] border border-white/55 p-6 active:cursor-grabbing dark:border-white/10',
          'bg-gradient-to-br',
          card.tone,
        )}
      >
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/50 dark:bg-white/10">
            <Icon size={30} />
          </div>
          <p className="text-[20px] font-black">{card.label}</p>
          <p className="mt-2 max-w-[240px] text-[12px] font-semibold leading-6 opacity-80">{card.hint}</p>
          <p className="mt-4 text-[11px] font-bold opacity-60">کارت را بکش یا دکمه زیر را بزن</p>
        </div>
      </motion.div>
      <div className="grid grid-cols-2 gap-2">
        {swipeResults.map((item) => {
          const ItemIcon = item.icon
          return (
            <button
              key={item.result}
              type="button"
              disabled={disabled}
              onClick={() => commit(item.result)}
              className="glass-inset rounded-2xl border border-white/50 px-3 py-3 text-right dark:border-white/10"
            >
              <div className="flex items-center gap-2">
                <ItemIcon size={16} />
                <span className="text-[12px] font-extrabold">{item.label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
