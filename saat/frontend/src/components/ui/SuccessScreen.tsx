import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Check, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SuccessScreenProps {
  title: string
  description?: string
  icon?: LucideIcon
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel?: string
  onSecondary?: () => void
  children?: ReactNode
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
const popSpring = { type: 'spring' as const, stiffness: 640, damping: 24 }

function AnimatedSuccessIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ ...popSpring, duration: 0.35 }}
      className="relative flex h-[88px] w-[88px] items-center justify-center"
    >
      <motion.span
        className="absolute inset-0 rounded-full bg-emerald-400/25"
        initial={{ scale: 0.8, opacity: 0.8 }}
        animate={{ scale: 1.55, opacity: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
      />
      <motion.span
        className="absolute inset-2 rounded-full border-2 border-emerald-400/35"
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />
      <span className="icon-3d icon-3d-success relative flex h-[76px] w-[76px] items-center justify-center rounded-full">
        <Icon size={38} className="text-white" strokeWidth={2.5} />
      </span>
    </motion.div>
  )
}

export function SuccessScreen({
  title,
  description,
  icon: Icon = Check,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
}: SuccessScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28 }}
      className="absolute inset-0 z-[70] flex flex-col items-center justify-center px-6"
    >
      <div className="pointer-events-none absolute inset-0 bg-black/25 backdrop-blur-[8px]" />
      <motion.div
        className="pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-20 -right-16 h-52 w-52 rounded-full bg-[#3390EC]/16 blur-3xl"
        animate={{ scale: [1, 1.06, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...spring, delay: 0.05 }}
        className={cn(
          'glass-card relative w-full max-w-[320px] overflow-hidden rounded-[28px]',
          'border border-white/60 p-6 text-center dark:border-white/10',
        )}
      >
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/12" />

        <AnimatedSuccessIcon Icon={Icon} />

        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, ...spring }}
          className="mt-5 text-[20px] font-black leading-snug text-text"
        >
          {title}
        </motion.h2>

        {description && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
            className="mx-auto mt-2 max-w-[260px] text-[13px] font-medium leading-6 text-text-muted"
          >
            {description}
          </motion.p>
        )}

        {children && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-5 w-full"
          >
            {children}
          </motion.div>
        )}

        <div className="mt-6 w-full space-y-2.5">
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            whileTap={{ scale: 0.98 }}
            onClick={onPrimary}
            className={cn(
              'relative flex h-[52px] w-full items-center justify-center overflow-hidden',
              'rounded-[16px] text-[15px] font-bold text-white',
              'bg-[#3390EC] shadow-[0_8px_24px_rgba(51,144,236,0.32)]',
              'dark:bg-[#8774E1] dark:shadow-[0_8px_24px_rgba(135,116,225,0.28)]',
            )}
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10" />
            <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/35" />
            <span className="relative">{primaryLabel}</span>
          </motion.button>

          {secondaryLabel && onSecondary && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.38 }}
              whileTap={{ scale: 0.98 }}
              onClick={onSecondary}
              className="flex w-full items-center justify-center py-2 text-[13px] font-semibold text-text-soft"
            >
              {secondaryLabel}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
