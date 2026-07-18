import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone =
  | 'hot'
  | 'warm'
  | 'cold'
  | 'primary'
  | 'success'
  | 'warning'
  | 'error'
  | 'neutral'
  | 'secondary'
  | 'accent'

const tones: Record<Tone, string> = {
  hot: 'glass-inset border border-hot-100/50 text-hot-600 dark:border-hot-500/20',
  warm: 'glass-inset border border-warm-100/50 text-warm-600 dark:border-warm-500/20',
  cold: 'glass-inset border border-cold-100/50 text-cold-600 dark:border-cold-500/20',
  primary: 'glass-inset border border-primary-200/50 text-primary-700 dark:border-primary-500/20',
  success: 'glass-inset border border-success-200/50 text-success-600 dark:border-success-500/20',
  warning: 'glass-inset border border-warning-200/50 text-warning-600 dark:border-warning-500/20',
  error: 'glass-inset border border-error-200/50 text-error-600 dark:border-error-500/20',
  neutral: 'glass-inset border border-white/50 text-[#8E8E93] dark:border-white/10 dark:text-[#98989D]',
  secondary: 'glass-inset border border-secondary-200/50 text-secondary-600 dark:border-secondary-500/20',
  accent: 'glass-inset border border-accent-200/50 text-accent-600 dark:border-accent-500/20',
}

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  icon?: ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Badge({ children, tone = 'neutral', icon, className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-full',
        size === 'sm'
          ? 'px-2 py-0.5 text-[11px]'
          : size === 'lg'
            ? 'px-3 py-1.5 text-[13px]'
            : 'px-2.5 py-1 text-xs',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
