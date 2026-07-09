import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export type ChipTone = 'primary' | 'hot' | 'warm' | 'cold' | 'error' | 'neutral'

interface ChipProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  icon?: ReactNode
  tone?: ChipTone
  className?: string
}

const activeStyles: Record<ChipTone, string> = {
  primary:
    'bg-[#3390EC] text-white border-[#3390EC] shadow-[0_4px_14px_-4px_rgba(51,144,236,0.55)] dark:bg-[#8774E1] dark:border-[#8774E1] dark:shadow-[0_4px_14px_-4px_rgba(135,116,225,0.55)]',
  hot: 'bg-hot-600 text-white border-hot-600 shadow-[0_4px_14px_-4px_rgba(255,107,0,0.45)]',
  warm: 'bg-warm-600 text-white border-warm-600 shadow-[0_4px_14px_-4px_rgba(255,176,0,0.45)]',
  cold: 'bg-cold-600 text-white border-cold-600 shadow-[0_4px_14px_-4px_rgba(82,107,128,0.45)]',
  error: 'bg-error-600 text-white border-error-600 shadow-[0_4px_14px_-4px_rgba(201,54,59,0.45)]',
  neutral:
    'bg-neutral-800 text-white border-neutral-800 shadow-[0_4px_14px_-4px_rgba(11,31,34,0.35)]',
}

const inactiveStyles: Record<ChipTone, string> = {
  primary:
    'glass-inset border-white/50 text-[#8E8E93] dark:border-white/10 dark:text-[#98989D]',
  hot: 'glass-inset border-hot-100/50 text-hot-600 dark:border-hot-500/20',
  warm: 'glass-inset border-warm-100/50 text-warm-600 dark:border-warm-500/20',
  cold: 'glass-inset border-cold-100/50 text-cold-600 dark:border-cold-500/20',
  error: 'glass-inset border-error-100/50 text-error-600 dark:border-error-500/20',
  neutral:
    'glass-inset border-white/50 text-[#8E8E93] dark:border-white/10 dark:text-[#98989D]',
}

export function Chip({ children, active, onClick, icon, tone = 'primary', className }: ChipProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 h-9 text-[13px] font-bold transition-colors',
        active ? activeStyles[tone] : inactiveStyles[tone],
        className,
      )}
    >
      {icon}
      {children}
    </motion.button>
  )
}
