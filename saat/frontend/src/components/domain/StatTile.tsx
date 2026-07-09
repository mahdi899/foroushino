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
  primary: 'icon-3d icon-3d-primary text-white',
  success: 'icon-3d icon-3d-success text-white',
  warning: 'icon-3d icon-3d-warning text-[#1A1200]',
  secondary: 'icon-3d icon-3d-warning text-[#1A1200]',
  accent: 'icon-3d icon-3d-primary text-white',
  cold: 'icon-3d icon-3d-primary text-white',
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
      <div
        className={cn(
          'glass-card flex flex-col items-center rounded-[18px] border border-white/55 p-3 text-center',
          'dark:border-white/10',
        )}
      >
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]', toneIconMap[tone])}>
          {icon}
        </span>
        <p className="mt-2.5 text-[20px] font-black tabular-nums leading-none tracking-tight text-text">
          {displayValue}
        </p>
        <p className="mt-1 w-full truncate text-[10px] font-semibold leading-tight text-text-soft">{label}</p>
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
