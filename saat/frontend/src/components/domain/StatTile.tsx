import type { ReactNode } from 'react'
import { toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

interface StatTileProps {
  icon: ReactNode
  value: number | string
  label: string
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
  tone = 'primary',
  variant = 'default',
}: StatTileProps) {
  const displayValue = typeof value === 'number' ? toFa(value) : value

  if (variant === 'compact') {
    return (
      <div className="flex flex-col items-center rounded-2xl bg-surface p-3 text-center shadow-card border border-border/60">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
            toneIconMap[tone],
          )}
        >
          {icon}
        </span>
        <p className="mt-2.5 text-[22px] font-black tabular-nums leading-none tracking-tight text-neutral-900">
          {displayValue}
        </p>
        <p className="mt-1 w-full truncate text-[10px] font-bold leading-tight text-neutral-400">{label}</p>
      </div>
    )
  }

  if (variant === 'embedded') {
    return (
      <div className="flex flex-col items-center gap-2 p-4 text-center">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            toneIconMap[tone],
          )}
        >
          {icon}
        </span>
        <p className="text-[24px] font-black tabular-nums leading-none tracking-tight text-neutral-900">
          {displayValue}
        </p>
        <p className="text-[11px] font-bold text-neutral-400">{label}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-[20px] bg-surface p-4 text-center shadow-card border border-border/60">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px]',
          toneIconMap[tone],
        )}
      >
        {icon}
      </span>
      <p className="text-[26px] font-black tabular-nums leading-none tracking-tight text-neutral-900">
        {displayValue}
      </p>
      <p className="text-[12px] font-bold text-neutral-400">{label}</p>
    </div>
  )
}
