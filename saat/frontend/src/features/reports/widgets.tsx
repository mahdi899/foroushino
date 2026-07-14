import type { FunnelStage, SourcePerf, TeamRow } from '@/data/reports'
import { stageLabels, sourceLabels } from '@/data/labels'
import { sourceIcon, sourceIconClass } from '@/components/domain/icons'
import { toFa } from '@/lib/format'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export function FunnelCard({ funnel }: { funnel: FunnelStage[] }) {
  const max = funnel[0]?.count ?? 1
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-card border border-border/60">
      <h3 className="mb-4 text-[15px] font-extrabold text-neutral-900">قیف فروش</h3>
      <div className="space-y-2.5">
        {funnel.map((s) => {
          const pct = Math.round((s.count / max) * 100)
          return (
            <div key={s.stage}>
              <div className="mb-1 flex items-center justify-between text-[11px] font-bold">
                <span className="text-neutral-600">{stageLabels[s.stage]}</span>
                <span className="text-neutral-400 tabular-nums">{toFa(s.count)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-neutral-100">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-primary-600 to-primary-400 transition-[width] duration-500 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SourceCard({ sources }: { sources: SourcePerf[] }) {
  const max = Math.max(...sources.map((s) => s.leads))
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-card border border-border/60">
      <h3 className="mb-4 text-[15px] font-extrabold text-neutral-900">منابع مشتری</h3>
      <div className="space-y-3">
        {sources.map((s) => {
          const Icon = sourceIcon[s.source]
          return (
            <div key={s.source} className="flex items-center gap-3">
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-50', sourceIconClass[s.source])}>
                <Icon size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-neutral-700">{sourceLabels[s.source]}</span>
                  <span className="text-[11px] font-bold text-neutral-400 tabular-nums">
                    {toFa(s.leads)} مشتری · {toFa(s.conversion)}٪
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-secondary-400"
                    style={{ width: `${(s.leads / max) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TeamCard({ teams }: { teams: TeamRow[] }) {
  return (
    <div className="rounded-3xl bg-surface p-4 shadow-card border border-border/60">
      <h3 className="mb-3 text-[15px] font-extrabold text-neutral-900">عملکرد تیم‌ها</h3>
      <div className="space-y-2">
        {teams.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-2xl bg-neutral-50 p-3">
            <div>
              <p className="text-[13px] font-extrabold text-neutral-900">{t.name}</p>
              <p className="text-[11px] font-bold text-neutral-400 tabular-nums">
                {toFa(t.calls)} تماس · {toFa(t.successful)} موفق
              </p>
            </div>
            <div className="text-left">
              <p className="text-base font-extrabold text-primary-700 tabular-nums">{toFa(t.conversion)}٪</p>
              <span
                className={cn(
                  'flex items-center justify-end gap-0.5 text-[10px] font-bold',
                  t.trend >= 0 ? 'text-success-500' : 'text-error-500',
                )}
              >
                {t.trend >= 0 ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                {toFa(Math.abs(t.trend))}٪
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
