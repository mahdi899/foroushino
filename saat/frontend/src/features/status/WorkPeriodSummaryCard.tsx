import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { formatDuration, formatHms, toFa } from '@/lib/format'
import {
  WORK_PERIOD_LABELS,
  WORK_PERIODS,
  aggregateWorkPeriod,
  getWorkPeriodDayEntries,
  workPeriodSpanDays,
  type WorkPeriod,
} from '@/lib/workPeriodSummary'
import { cn } from '@/lib/cn'
import type { Availability, Call, WorkDaySummary, WorkSession } from '@/types'

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

interface WorkPeriodSummaryCardProps {
  workDaySummaries: WorkDaySummary[]
  workSession: WorkSession | null
  availability: Availability
  availabilityChangedAt: string | null
  nowMs: number
  calls?: Call[]
  agentId?: string
}

function formatShiftBrief(totalSec: number): string {
  if (totalSec <= 0) return '—'
  if (totalSec < 3600) return formatDuration(totalSec)
  return formatHms(totalSec)
}

export function WorkPeriodSummaryCard({
  workDaySummaries,
  workSession,
  availability,
  availabilityChangedAt,
  nowMs,
  calls,
  agentId,
}: WorkPeriodSummaryCardProps) {
  const [period, setPeriod] = useState<WorkPeriod>('daily')

  const live = useMemo(
    () => ({ workSession, availability, availabilityChangedAt, nowMs, calls, agentId }),
    [workSession, availability, availabilityChangedAt, nowMs, calls, agentId],
  )

  const totals = useMemo(
    () => aggregateWorkPeriod(workDaySummaries, period, live),
    [workDaySummaries, period, live],
  )

  const dayEntries = useMemo(
    () => getWorkPeriodDayEntries(workDaySummaries, period, live),
    [workDaySummaries, period, live],
  )

  const spanDays = workPeriodSpanDays(period)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.22 }}
    >
      <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-text-muted">
        خلاصه عملکرد
      </p>

      <div className="ios-inset-group overflow-hidden">
        <div className="flex items-center gap-2.5 px-3.5 py-3 ios-list-row-divider">
          <span className="ios-action-icon bg-primary-500/12 text-primary-600 dark:bg-primary-400/16 dark:text-primary-400">
            <BarChart3 size={16} strokeWidth={2.15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-text">{WORK_PERIOD_LABELS[period]}</p>
            <p className="text-[11px] font-medium text-text-soft">{toFa(spanDays)} روز</p>
          </div>
        </div>

        <div className="px-3 pb-3 pt-1">
          <div className="flex gap-1 rounded-[10px] bg-black/[0.04] p-1 dark:bg-white/[0.06]">
            {WORK_PERIODS.map((key) => {
              const active = key === period
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setPeriod(key)}
                  className={cn(
                    'min-w-0 flex-1 rounded-[8px] px-2 py-1.5 text-[11px] font-semibold transition-all duration-200',
                    active
                      ? 'bg-surface text-text shadow-[0_1px_3px_rgba(0,0,0,0.08)] dark:bg-surface-elevated'
                      : 'text-text-muted',
                  )}
                >
                  {WORK_PERIOD_LABELS[key]}
                </button>
              )
            })}
          </div>
        </div>

        {period === 'weekly' && dayEntries.length > 0 && (
          <div className="border-t border-black/[0.04] px-3.5 pb-3 pt-3 dark:border-white/[0.06]">
            <p className="mb-2 text-[10px] font-medium text-text-soft">شیفت روزانه · هفته جاری</p>
            <div className="grid grid-cols-7 gap-1">
              {dayEntries.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    'rounded-[10px] px-1 py-2 text-center',
                    day.hasWork
                      ? 'bg-primary-500/10 text-primary-700 dark:bg-primary-400/12 dark:text-primary-300'
                      : 'bg-black/[0.03] dark:bg-white/[0.04]',
                  )}
                >
                  <p className="text-[10px] font-semibold opacity-80">{toFa(day.label)}</p>
                  <p className="mt-1 text-[10px] font-bold tabular-nums leading-none">
                    {formatShiftBrief(day.productiveSeconds)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {period === '30d' && dayEntries.length > 0 && (
          <div className="border-t border-black/[0.04] px-3.5 pb-3 pt-3 dark:border-white/[0.06]">
            <p className="mb-2 text-[10px] font-medium text-text-soft">شیفت روزانه · ۳۰ روز اخیر</p>
            <div className="grid grid-cols-6 gap-1.5">
              {dayEntries.map((day) => (
                <div
                  key={day.date}
                  className={cn(
                    'rounded-[9px] px-1 py-1.5 text-center',
                    day.hasWork
                      ? 'bg-primary-500/10 text-primary-700 dark:bg-primary-400/12 dark:text-primary-300'
                      : 'bg-black/[0.03] dark:bg-white/[0.04]',
                  )}
                >
                  <p className="text-[10px] font-semibold opacity-80">
                    {toFa(day.label)}
                    {day.sublabel ? '·' : ''}
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold tabular-nums leading-none">
                    {formatShiftBrief(day.productiveSeconds)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-black/[0.04] px-3.5 py-3 dark:border-white/[0.06]">
          <MetricCell label="تعداد تماس‌ها" value={toFa(totals.callsCount)} />
          <MetricCell label="تعداد شیفت" value={toFa(totals.sessionsCount)} />
          <MetricCell label="زمان مکالمه" value={formatHms(totals.totalCallSeconds)} />
          <MetricCell label="استراحت" value={formatHms(totals.totalBreakSeconds)} />
        </div>

        <div className="border-t border-black/[0.04] bg-black/[0.02] px-3.5 py-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-text-soft">جمع زمان مولد</p>
              <p className="mt-1 text-[10px] font-medium text-text-muted">
                {WORK_PERIOD_LABELS[period]}
              </p>
            </div>
            <p className="ltr-nums text-[24px] font-bold tabular-nums leading-none text-text">
              {formatHms(totals.totalProductiveSeconds)}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]">
      <p className="text-[10px] font-medium text-text-soft">{label}</p>
      <p className="mt-1 text-[15px] font-bold tabular-nums text-text">{value}</p>
    </div>
  )
}
