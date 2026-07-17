import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Crown, Sparkles } from 'lucide-react'
import type { DailyTopRank } from '@/lib/dailyTopPerformers'
import { RankOneFountain } from '@/components/ui/RankOneFountain'
import { cn } from '@/lib/cn'

const rankTheme: Record<
  DailyTopRank,
  {
    ring: string
    glow: string
    badge: string
    badgeText: string
    sparkles: string
  }
> = {
  1: {
    ring: 'from-amber-300 via-yellow-200 to-amber-500',
    glow: 'bg-amber-400/45 dark:bg-amber-300/30',
    badge: 'from-amber-500 to-yellow-400 text-amber-950 shadow-amber-500/35',
    badgeText: 'نفر اول امروز',
    sparkles: 'text-amber-300',
  },
  2: {
    ring: 'from-slate-200 via-white to-slate-400',
    glow: 'bg-slate-300/40 dark:bg-slate-200/25',
    badge: 'from-slate-400 to-slate-200 text-slate-900 shadow-slate-400/30',
    badgeText: 'نفر دوم امروز',
    sparkles: 'text-slate-200',
  },
  3: {
    ring: 'from-orange-300 via-amber-200 to-orange-500',
    glow: 'bg-orange-400/35 dark:bg-orange-300/22',
    badge: 'from-orange-500 to-amber-400 text-orange-950 shadow-orange-500/30',
    badgeText: 'نفر سوم امروز',
    sparkles: 'text-orange-300',
  },
}

interface TopPerformerAvatarRingProps {
  rank: DailyTopRank
  children: ReactNode
  className?: string
  showBadge?: boolean
  /** `compact` for 44px header avatars; `profile` for large profile picker */
  variant?: 'compact' | 'profile'
}

const variantConfig = {
  compact: {
    glowInset: '-inset-1.5',
    glowBlur: 'blur-md',
    ringInset: '-inset-[3px]',
    padding: 'p-[2px]',
    shadow: 'shadow-[0_4px_16px_-6px_rgba(251,191,36,0.45)]',
    crownSize: 11,
    crownClass: 'absolute -top-1 -right-1 z-[3]',
    sparkleSize: 8,
    showSparkles: false,
  },
  profile: {
    glowInset: '-inset-3',
    glowBlur: 'blur-xl',
    ringInset: '-inset-[5px]',
    padding: 'p-[3px]',
    shadow: 'shadow-[0_8px_28px_-8px_rgba(251,191,36,0.55)]',
    crownSize: 20,
    crownClass: 'absolute -top-3 left-1/2 z-[3] -translate-x-1/2',
    sparkleSize: 12,
    showSparkles: true,
  },
} as const

export function TopPerformerAvatarRing({
  rank,
  children,
  className,
  showBadge = true,
  variant = 'profile',
}: TopPerformerAvatarRingProps) {
  const theme = rankTheme[rank]
  const cfg = variantConfig[variant]

  return (
    <div className={cn('relative flex flex-col items-center', className)}>
      <div className="relative overflow-visible">
        {rank === 1 && <RankOneFountain variant={variant} />}

        <motion.div
          aria-hidden
          className={cn(
            'pointer-events-none absolute rounded-full',
            cfg.glowInset,
            cfg.glowBlur,
            theme.glow,
          )}
          animate={{ opacity: [0.45, 0.9, 0.45], scale: [0.94, 1.06, 0.94] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div
          aria-hidden
          className={cn(
            'pointer-events-none absolute rounded-full bg-gradient-to-br opacity-90',
            cfg.ringInset,
            theme.ring,
          )}
          animate={{ rotate: 360 }}
          transition={{ duration: rank === 1 ? 5 : 7, repeat: Infinity, ease: 'linear' }}
        />

        <div
          className={cn(
            'relative z-[2] rounded-full bg-background ring-1 ring-white/70 dark:ring-white/15',
            cfg.padding,
            cfg.shadow,
            rank === 1 && 'shadow-[0_10px_36px_-8px_rgba(251,191,36,0.7)]',
          )}
        >
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
          >
            <motion.div
              className="absolute -inset-full bg-gradient-to-r from-transparent via-white/55 to-transparent dark:via-white/25"
              animate={{ rotate: [0, 25, 0], x: ['-30%', '130%', '-30%'] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: rank * 0.15 }}
            />
          </motion.div>

          {children}
        </div>

        {rank === 1 && (
          <motion.div
            className={cn(cfg.crownClass, 'z-[4]')}
            animate={variant === 'profile' ? { y: [0, -3, 0], rotate: [0, -4, 4, 0] } : { scale: [1, 1.08, 1] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Crown
              size={cfg.crownSize}
              className="text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.65)]"
              fill="currentColor"
              strokeWidth={1.25}
            />
          </motion.div>
        )}

        {(cfg.showSparkles || rank === 1) && (
          <>
            <Sparkle size={cfg.sparkleSize} className={cn('absolute -right-1 top-1 z-[3]', theme.sparkles)} delay={0} />
            <Sparkle size={cfg.sparkleSize} className={cn('absolute -left-1.5 bottom-2 z-[3]', theme.sparkles)} delay={0.6} />
            <Sparkle size={cfg.sparkleSize} className={cn('absolute right-1 bottom-0 z-[3]', theme.sparkles)} delay={1.1} />
            {rank === 1 && variant === 'profile' && (
              <Sparkle size={cfg.sparkleSize + 2} className={cn('absolute -top-1 left-1/2 z-[3] -translate-x-1/2', theme.sparkles)} delay={0.3} />
            )}
          </>
        )}
      </div>

      {showBadge && variant === 'profile' && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-[10px] font-extrabold shadow-md',
            theme.badge,
          )}
        >
          <Sparkles size={10} strokeWidth={2.5} />
          {theme.badgeText}
        </motion.span>
      )}
    </div>
  )
}

function Sparkle({
  className,
  delay,
  size,
}: {
  className?: string
  delay: number
  size: number
}) {
  return (
    <motion.span
      aria-hidden
      className={cn('pointer-events-none', className)}
      animate={{ opacity: [0.2, 1, 0.2], scale: [0.7, 1.15, 0.7], rotate: [0, 18, 0] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <Sparkles size={size} strokeWidth={2.25} />
    </motion.span>
  )
}
