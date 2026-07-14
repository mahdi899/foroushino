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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: 0.28 }}
      className={cn(
        'glass-card overflow-hidden rounded-[24px] border border-white/55 dark:border-white/10',
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/40 px-4 py-3.5 dark:border-white/8">
        <span className="icon-3d icon-3d-primary flex h-8 w-8 items-center justify-center">
          <BarChart3 size={15} className="text-white" strokeWidth={2.35} />
        </span>
        <div>
          <p className="text-[14px] font-black text-text">خلاصه عملکرد</p>
          <p className="text-[11px] font-semibold text-text-soft">
            {WORK_PERIOD_LABELS[period]} · {toFa(spanDays)} روز
          </p>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
        {WORK_PERIODS.map((key) => {
          const active = key === period
          return (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
                active
                  ? 'border-[#3390EC]/35 bg-[#3390EC]/14 text-[#3390EC] dark:border-[#8774E1]/35 dark:bg-[#8774E1]/14 dark:text-[#8774E1]'
                  : 'border-white/55 bg-white/35 text-text-muted dark:border-white/10 dark:bg-white/5',
              )}
            >
              {WORK_PERIOD_LABELS[key]}
            </button>
          )
        })}
      </div>

      {period === 'weekly' && dayEntries.length > 0 && (
        <div className="border-b border-white/35 px-4 pb-3 dark:border-white/8">
          <p className="mb-2 text-[10px] font-semibold text-text-soft">شیفت روزانه · هفته جاری</p>
          <div className="grid grid-cols-7 gap-1">
            {dayEntries.map((day) => (
              <div
                key={day.date}
                className={cn(
                  'rounded-[10px] border px-1 py-2 text-center',
                  day.hasWork
                    ? 'border-[#3390EC]/25 bg-[#3390EC]/8 dark:border-[#8774E1]/25 dark:bg-[#8774E1]/10'
                    : 'border-white/45 bg-white/25 dark:border-white/8 dark:bg-white/[0.03]',
                )}
              >
                <p className="text-[10px] font-bold text-text-soft">{toFa(day.label)}</p>
                <p className="mt-1 text-[10px] font-black tabular-nums leading-none text-text">
                  {formatShiftBrief(day.productiveSeconds)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {period === '30d' && dayEntries.length > 0 && (
        <div className="border-b border-white/35 px-4 pb-3 dark:border-white/8">
          <p className="mb-2 text-[10px] font-semibold text-text-soft">شیفت روزانه · ۳۰ روز اخیر</p>
          <div className="grid grid-cols-6 gap-1.5">
            {dayEntries.map((day) => (
              <div
                key={day.date}
                className={cn(
                  'rounded-[9px] border px-1 py-1.5 text-center',
                  day.hasWork
                    ? 'border-[#3390EC]/25 bg-[#3390EC]/8 dark:border-[#8774E1]/25 dark:bg-[#8774E1]/10'
                    : 'border-white/45 bg-white/25 dark:border-white/8 dark:bg-white/[0.03]',
                )}
              >
                <p className="text-[10px] font-bold text-text-soft">
                  {toFa(day.label)}
                  {day.sublabel ? '·' : ''}
                </p>
                <p className="mt-0.5 text-[9px] font-black tabular-nums leading-none text-text">
                  {formatShiftBrief(day.productiveSeconds)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 px-4 pb-3 pt-3">
        <MetricCell label="تعداد تماس‌ها" value={toFa(totals.callsCount)} />
        <MetricCell label="تعداد شیفت" value={toFa(totals.sessionsCount)} />
        <MetricCell label="زمان مکالمه" value={formatHms(totals.totalCallSeconds)} />
        <MetricCell label="استراحت" value={formatHms(totals.totalBreakSeconds)} />
      </div>

      <div className="border-t border-white/40 bg-white/20 px-4 py-4 dark:border-white/8 dark:bg-white/[0.03]">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold text-text-soft">جمع زمان مولد</p>
            <p className="mt-1 text-[10px] font-semibold text-text-muted">
              {WORK_PERIOD_LABELS[period]}
            </p>
          </div>
          <p className="ltr-nums text-[24px] font-black tabular-nums leading-none text-text">
            {formatHms(totals.totalProductiveSeconds)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-white/45 bg-white/30 px-3 py-2.5 dark:border-white/8 dark:bg-white/[0.04]">
      <p className="text-[10px] font-semibold text-text-soft">{label}</p>
      <p className="mt-1 text-[15px] font-black tabular-nums text-text">{value}</p>
    </div>
  )
}
