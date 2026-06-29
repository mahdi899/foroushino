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
  hot: 'bg-hot-50 text-hot-600',
  warm: 'bg-warm-50 text-warm-600',
  cold: 'bg-cold-50 text-cold-600',
  primary: 'bg-primary-50 text-primary-700',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  error: 'bg-error-50 text-error-600',
  neutral: 'bg-neutral-100 text-neutral-600',
  secondary: 'bg-secondary-50 text-secondary-600',
  accent: 'bg-accent-50 text-accent-600',
}

interface BadgeProps {
  children: ReactNode
  tone?: Tone
  icon?: ReactNode
  className?: string
  size?: 'sm' | 'md'
}

export function Badge({ children, tone = 'neutral', icon, className, size = 'md' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold rounded-full',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
