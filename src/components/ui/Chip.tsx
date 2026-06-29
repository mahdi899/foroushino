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
    'bg-primary-600 text-white border-primary-600 shadow-[0_6px_16px_-6px_rgba(13,148,136,0.55)]',
  hot: 'bg-hot-600 text-white border-hot-600 shadow-[0_6px_16px_-6px_rgba(225,29,72,0.45)]',
  warm: 'bg-warm-600 text-white border-warm-600 shadow-[0_6px_16px_-6px_rgba(217,119,6,0.45)]',
  cold: 'bg-cold-600 text-white border-cold-600 shadow-[0_6px_16px_-6px_rgba(37,99,235,0.45)]',
  error: 'bg-error-600 text-white border-error-600 shadow-[0_6px_16px_-6px_rgba(220,38,38,0.45)]',
  neutral:
    'bg-neutral-800 text-white border-neutral-800 shadow-[0_6px_16px_-6px_rgba(15,23,42,0.35)]',
}

const inactiveStyles: Record<ChipTone, string> = {
  primary: 'bg-surface text-neutral-600 border-border',
  hot: 'bg-hot-50 text-hot-600 border-hot-100',
  warm: 'bg-warm-50 text-warm-600 border-warm-100',
  cold: 'bg-cold-50 text-cold-600 border-cold-100',
  error: 'bg-error-50 text-error-600 border-error-100',
  neutral: 'bg-surface text-neutral-600 border-border',
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
