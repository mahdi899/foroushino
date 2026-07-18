import { toFa } from '@/lib/format'
import { haptic } from '@/lib/telegram'
import type { TeamMetricKind } from '@/lib/teamMetricBreakdown'
import { cn } from '@/lib/cn'

function StatCell({
  value,
  label,
  warn,
  accent,
  onClick,
}: {
  value: string | number
  label: string
  warn?: boolean
  accent?: 'blue' | 'green' | 'orange' | 'red'
  onClick?: () => void
}) {
  const accentRing =
    accent === 'green'
      ? 'border-emerald-500/20 bg-emerald-500/8'
      : accent === 'orange'
        ? 'border-orange-500/20 bg-orange-500/8'
        : accent === 'red'
          ? 'border-red-500/20 bg-red-500/8'
          : 'border-[#3390EC]/20 bg-[#3390EC]/8 dark:border-[#8774E1]/25 dark:bg-[#8774E1]/10'

  const body = (
    <>
      <span
        className={cn(
          'text-[18px] font-black tabular-nums leading-none',
          warn ? 'text-amber-600 dark:text-amber-400' : 'text-text',
        )}
      >
        {typeof value === 'number' ? toFa(value) : value}
      </span>
      <span className="mt-1 text-center text-[9px] font-bold leading-tight text-text-soft">{label}</span>
    </>
  )

  const className = cn(
    'glass-inset flex flex-col items-center rounded-[14px] border px-1.5 py-2.5',
    accentRing,
    warn && 'border-amber-500/30 bg-amber-500/10',
    onClick && 'cursor-pointer transition-transform active:scale-[0.97]',
  )

  if (!onClick) {
    return <div className={className}>{body}</div>
  }

  return (
    <button
      type="button"
      onClick={() => {
        haptic('selection')
        onClick()
      }}
      className={className}
    >
      {body}
    </button>
  )
}

type MetricStatGridProps = {
  totalCalls: number
  conversion: number
  hotLeads: number
  overdueCount: number
  onMetricClick?: (kind: TeamMetricKind) => void
  className?: string
}

export function MetricStatGrid({
  totalCalls,
  conversion,
  hotLeads,
  overdueCount,
  onMetricClick,
  className,
}: MetricStatGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <StatCell
        value={totalCalls}
        label="تماس امروز"
        accent="blue"
        onClick={onMetricClick ? () => onMetricClick('calls') : undefined}
      />
      <StatCell
        value={`${toFa(conversion)}٪`}
        label="نرخ تبدیل"
        accent="green"
        onClick={onMetricClick ? () => onMetricClick('conversion') : undefined}
      />
      <StatCell
        value={hotLeads}
        label="لید داغ"
        accent="orange"
        onClick={onMetricClick ? () => onMetricClick('hot_leads') : undefined}
      />
      <StatCell
        value={overdueCount}
        label="عقب‌افتاده"
        warn={overdueCount > 0}
        accent={overdueCount > 0 ? 'red' : undefined}
        onClick={onMetricClick ? () => onMetricClick('overdue') : undefined}
      />
    </div>
  )
}
