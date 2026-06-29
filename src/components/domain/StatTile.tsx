import type { ReactNode } from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

interface StatTileProps {
  icon: ReactNode
  value: number | string
  label: string
  trend?: number
  tone?: 'primary' | 'success' | 'warning' | 'secondary' | 'accent' | 'cold'
  variant?: 'default' | 'compact' | 'embedded'
}

const toneIconMap = {
  primary: 'bg-primary-50 text-primary-600',
  success: 'bg-success-50 text-success-600',
  warning: 'bg-warning-50 text-warning-600',
  secondary: 'bg-secondary-50 text-secondary-600',
  accent: 'bg-accent-50 text-accent-600',
  cold: 'bg-cold-50 text-cold-600',
}

export function StatTile({
  icon,
  value,
  label,
  trend,
  tone = 'primary',
  variant = 'default',
}: StatTileProps) {
  const displayValue = typeof value === 'number' ? toFa(value) : value

  const trendBadge = (size: 'sm' | 'md' = 'md') =>
    trend !== undefined ? (
      <span
        className={cn(
          'inline-flex shrink-0 items-center gap-0.5 rounded-full font-bold leading-none',
          size === 'sm' ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-0.5 text-[10px]',
          trend >= 0 ? 'bg-success-50 text-success-600' : 'bg-error-50 text-error-600',
        )}
      >
        {trend >= 0 ? (
          <ArrowUp size={size === 'sm' ? 9 : 10} strokeWidth={2.5} />
        ) : (
          <ArrowDown size={size === 'sm' ? 9 : 10} strokeWidth={2.5} />
        )}
        {toFa(Math.abs(trend))}٪
      </span>
    ) : null

  if (variant === 'compact') {
    return (
      <div className="flex flex-col rounded-2xl bg-surface p-3 shadow-card border border-border/60">
        <div className="flex items-start justify-between gap-1">
          <span
            className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
              toneIconMap[tone],
            )}
          >
            {icon}
          </span>
          {trendBadge('sm')}
        </div>
        <p className="mt-2.5 text-[22px] font-black tabular-nums leading-none tracking-tight text-neutral-900">
          {displayValue}
        </p>
        <p className="mt-1 truncate text-[10px] font-bold leading-tight text-neutral-400">{label}</p>
      </div>
    )
  }

  if (variant === 'embedded') {
    return (
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
              toneIconMap[tone],
            )}
          >
            {icon}
          </span>
          {trendBadge()}
        </div>
        <p className="text-[24px] font-black tabular-nums leading-none tracking-tight text-neutral-900">
          {displayValue}
        </p>
        <p className="text-[11px] font-bold text-neutral-400">{label}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 rounded-[20px] bg-surface p-4 shadow-card border border-border/60">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px]',
            toneIconMap[tone],
          )}
        >
          {icon}
        </span>
        {trendBadge()}
      </div>
      <p className="text-[26px] font-black tabular-nums leading-none tracking-tight text-neutral-900">
        {displayValue}
      </p>
      <p className="text-[12px] font-bold text-neutral-400">{label}</p>
    </div>
  )
}
