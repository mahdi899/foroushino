import type { CSSProperties } from 'react'
import { Gift } from 'lucide-react'
import { cn } from '@/lib/cn'

const RIBBON_COLORS = ['#10A37F', '#3390EC', '#FFB000', '#8774E1', '#34D399', '#FF6B00']

const ribbons = [
  { left: '8%', drift: '-6px', delay: '0s', dur: '1.2s', h: 32, w: 4 },
  { left: '20%', drift: '5px', delay: '0.08s', dur: '1.35s', h: 28, w: 3 },
  { left: '34%', drift: '-4px', delay: '0.14s', dur: '1.25s', h: 36, w: 4 },
  { left: '48%', drift: '7px', delay: '0.05s', dur: '1.4s', h: 30, w: 3 },
  { left: '62%', drift: '-5px', delay: '0.18s', dur: '1.3s', h: 34, w: 4 },
  { left: '76%', drift: '6px', delay: '0.1s', dur: '1.28s', h: 26, w: 3 },
  { left: '90%', drift: '-7px', delay: '0.16s', dur: '1.32s', h: 30, w: 3 },
  { left: '-3px', top: '18%', drift: '32px', delay: '0.12s', dur: '1.38s', h: 24, w: 3 },
  { left: '-3px', top: '55%', drift: '28px', delay: '0.22s', dur: '1.3s', h: 22, w: 3 },
  { right: '-3px', top: '22%', drift: '-30px', delay: '0.15s', dur: '1.36s', h: 24, w: 3 },
  { right: '-3px', top: '58%', drift: '-26px', delay: '0.24s', dur: '1.28s', h: 22, w: 3 },
] as const

const gifts = [
  { className: '-left-1 -top-2', rotate: -14, delay: '0.05s', tone: 'emerald' },
  { className: '-right-1 -top-1', rotate: 12, delay: '0.12s', tone: 'blue' },
  { className: '-left-2 top-[40%]', rotate: -8, delay: '0.18s', tone: 'gold' },
  { className: '-right-2 top-[44%]', rotate: 10, delay: '0.22s', tone: 'purple' },
  { className: 'bottom-[-6px] left-[46%]', rotate: 4, delay: '0.28s', tone: 'emerald' },
] as const

const giftTone: Record<(typeof gifts)[number]['tone'], string> = {
  emerald: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-600',
  blue: 'border-[#3390EC]/30 bg-[#3390EC]/10 text-[#3390EC] dark:border-[#8774E1]/35 dark:bg-[#8774E1]/12 dark:text-[#8774E1]',
  gold: 'border-warning-400/35 bg-warning-500/12 text-warning-600',
  purple: 'border-[#8774E1]/35 bg-[#8774E1]/12 text-[#8774E1]',
}

export function GoalCelebration() {
  return (
    <div className="pointer-events-none absolute -inset-4 z-[2] overflow-visible" aria-hidden>
      {ribbons.map((r, i) => (
        <span
          key={i}
          className="goal-ribbon"
          style={
            {
              width: r.w,
              height: r.h,
              top: 'top' in r ? r.top : -8,
              left: 'left' in r ? r.left : undefined,
              right: 'right' in r ? r.right : undefined,
              backgroundColor: RIBBON_COLORS[i % RIBBON_COLORS.length],
              '--ribbon-drift': r.drift,
              '--ribbon-delay': r.delay,
              '--ribbon-dur': r.dur,
            } as CSSProperties
          }
        />
      ))}

      {gifts.map((gift, i) => (
        <div
          key={i}
          className={cn(
            'goal-gift glass-inset absolute flex h-7 w-7 items-center justify-center rounded-[10px] border shadow-sm opacity-0',
            gift.className,
            giftTone[gift.tone],
          )}
          style={
            {
              '--gift-rotate': `${gift.rotate}deg`,
              '--gift-delay': gift.delay,
            } as CSSProperties
          }
        >
          <Gift size={13} strokeWidth={2.35} />
        </div>
      ))}
    </div>
  )
}
