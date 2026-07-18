import type { ReactNode } from 'react'
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
    'bg-primary-600 text-white border-primary-600 shadow-[0_4px_14px_-4px_rgba(0,111,117,0.45)] dark:bg-primary-500 dark:border-primary-500 dark:shadow-[0_4px_14px_-4px_rgba(0,140,150,0.4)]',
  hot: 'bg-hot-600 text-white border-hot-600 shadow-[0_4px_14px_-4px_rgba(255,107,0,0.45)]',
  warm: 'bg-warm-600 text-white border-warm-600 shadow-[0_4px_14px_-4px_rgba(255,176,0,0.45)]',
  cold: 'bg-cold-600 text-white border-cold-600 shadow-[0_4px_14px_-4px_rgba(82,107,128,0.45)]',
  error: 'bg-error-600 text-white border-error-600 shadow-[0_4px_14px_-4px_rgba(201,54,59,0.45)]',
  neutral:
    'bg-neutral-800 text-white border-neutral-800 shadow-[0_4px_14px_-4px_rgba(11,31,34,0.35)]',
}

const inactiveStyles: Record<ChipTone, string> = {
  primary: 'bg-surface-soft border-border text-text-soft',
  hot: 'bg-surface-soft border-hot-100/50 text-hot-600 dark:border-hot-500/20 dark:text-hot-300',
  warm: 'bg-surface-soft border-warm-100/50 text-warm-600 dark:border-warm-500/20 dark:text-warm-300',
  cold: 'bg-surface-soft border-cold-100/50 text-cold-600 dark:border-cold-500/20 dark:text-cold-300',
  error: 'bg-surface-soft border-error-100/50 text-error-600 dark:border-error-500/20 dark:text-error-300',
  neutral: 'bg-surface-soft border-border text-text-soft',
}

export function Chip({ children, active, onClick, icon, tone = 'primary', className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 h-9 text-[13px] font-bold transition-colors active:scale-[0.96]',
        active ? activeStyles[tone] : inactiveStyles[tone],
        className,
      )}
    >
      {icon}
      {children}
    </button>
  )
}
