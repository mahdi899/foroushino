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
}

const toneMap = {
  primary: 'text-primary-600',
  success: 'text-success-600',
  warning: 'text-warning-600',
  secondary: 'text-secondary-600',
  accent: 'text-accent-600',
  cold: 'text-cold-600',
}

export function StatTile({ icon, value, label, trend, tone = 'primary' }: StatTileProps) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-surface p-3 shadow-card border border-border/60">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-neutral-400">{label}</span>
        <span className={toneMap[tone]}>{icon}</span>
      </div>
      <span className="text-xl font-extrabold text-neutral-900 tabular-nums">
        {typeof value === 'number' ? toFa(value) : value}
      </span>
      {trend !== undefined && (
        <span
          className={cn(
            'flex items-center gap-0.5 text-[10px] font-bold',
            trend >= 0 ? 'text-success-500' : 'text-error-500',
          )}
        >
          {trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
          {toFa(Math.abs(trend))}٪
        </span>
      )}
    </div>
  )
}
