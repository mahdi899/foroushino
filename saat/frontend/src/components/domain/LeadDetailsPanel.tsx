import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Wallet,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  MessageSquareWarning,
  NotebookPen,
  History,
  CalendarClock,
  Repeat2,
  ListTree,
  Sparkles,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { LeadProfileHero } from '@/components/domain/LeadProfileHero'
import { StageBar } from '@/components/domain/StageBar'
import { resultIcon } from '@/components/domain/icons'
import { LeadStatusBadge } from '@/components/domain/Badges'
import {
  experienceLabels,
  objectionLabels,
  resultLabels,
  leadStatusLabels,
} from '@/data/labels'
import { relativeDayTime, toFa, formatDuration } from '@/lib/format'
import { cn } from '@/lib/cn'
import type { Lead } from '@/types'

function DetailIconBox({
  icon: Icon,
  tone = 'primary',
}: {
  icon: LucideIcon
  tone?: 'primary' | 'warning' | 'error' | 'accent'
}) {
  const tones = {
    primary: 'text-[#3390EC] dark:text-[#8774E1]',
    warning: 'text-warning-600',
    error: 'text-error-600',
    accent: 'text-accent-600',
  }
  return (
    <div
      className={cn(
        'glass-inset flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/50 dark:border-white/10',
        tones[tone],
      )}
    >
      <Icon size={15} strokeWidth={2.25} />
    </div>
  )
}

function DetailSectionHeader({
  icon,
  title,
  count,
}: {
  icon: LucideIcon
  title: string
  count?: number | string
}) {
  return (
    <div className="flex items-center gap-2">
      <DetailIconBox icon={icon} />
      <p className="text-[13px] font-bold text-neutral-900 dark:text-white">{title}</p>
      {count !== undefined && (
        <span className="glass-inset mr-auto rounded-full border border-white/50 px-2 py-0.5 text-[10px] font-bold text-[#8E8E93] tabular-nums dark:border-white/10 dark:text-[#98989D]">
          {count}
        </span>
      )}
    </div>
  )
}

function DetailRow({
  icon,
  tone = 'primary',
  label,
  value,
  meta,
  sub,
}: {
  icon: LucideIcon
  tone?: 'primary' | 'warning' | 'error' | 'accent'
  label?: string
  value: ReactNode
  meta?: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="glass-inset flex items-center gap-2.5 rounded-2xl border border-white/50 px-3 py-2.5 dark:border-white/10">
      <DetailIconBox icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        {label && <p className="text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">{label}</p>}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 text-[12px] font-bold leading-5 text-neutral-800 dark:text-neutral-100">{value}</div>
          {meta && (
            <span className="shrink-0 text-[10px] font-semibold text-[#8E8E93] tabular-nums dark:text-[#98989D]">
              {meta}
            </span>
          )}
        </div>
        {sub && <p className="mt-0.5 truncate text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">{sub}</p>}
      </div>
    </div>
  )
}

function DetailDivider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
}

export function LeadDetailsPanel({ lead }: { lead: Lead }) {
  const calls = useStore((s) => s.calls.filter((c) => c.leadId === lead.id))
  const followups = useStore((s) => s.followups.filter((f) => f.leadId === lead.id))

  const info = [
    { icon: Wallet, label: 'بودجه حدودی', value: lead.budget },
    { icon: Briefcase, label: 'شغل فعلی', value: lead.job },
    { icon: GraduationCap, label: 'تجربه', value: experienceLabels[lead.experience] },
    { icon: Target, label: 'هدف درآمدی', value: lead.incomeGoal },
    { icon: Clock, label: 'زمان تماس', value: lead.bestCallTime },
    { icon: TrendingUp, label: 'احتمال تبدیل', value: `${toFa(lead.conversionProbability)}٪` },
  ]

  return (
    <div className="space-y-4">
      <LeadProfileHero lead={lead} />

      {lead.status && (
        <div className="flex items-center justify-center">
          <LeadStatusBadge status={lead.status} />
        </div>
      )}

      <StageBar stage={lead.stage} />

      <div className="glass-card space-y-3 rounded-[26px] border border-white/55 p-4 dark:border-white/10">
        <div className="grid grid-cols-2 gap-2">
          {info.map((item) => (
            <DetailRow key={item.label} icon={item.icon} label={item.label} value={item.value} />
          ))}
        </div>

        {(lead.interestReason || lead.painPoint || lead.objection || lead.lastNote) && (
          <>
            <DetailDivider />
            <div className="space-y-2">
              {lead.interestReason && (
                <DetailRow icon={Sparkles} label="علت علاقه‌مندی" value={lead.interestReason} />
              )}
              {lead.painPoint && (
                <DetailRow icon={AlertCircle} tone="warning" label="نیاز اصلی" value={lead.painPoint} />
              )}
              {lead.objection && (
                <DetailRow
                  icon={MessageSquareWarning}
                  tone="error"
                  label="اعتراض احتمالی"
                  value={objectionLabels[lead.objection]}
                />
              )}
              {lead.lastNote && (
                <DetailRow icon={NotebookPen} label="آخرین یادداشت" value={lead.lastNote} />
              )}
            </div>
          </>
        )}

        <DetailDivider />
        <DetailSectionHeader icon={History} title="تاریخچه تماس" count={toFa(calls.length || lead.callCount)} />
        {calls.length === 0 ? (
          <p className="pr-10 text-[11px] font-bold text-neutral-400">
            {lead.callCount > 0 ? `${toFa(lead.callCount)} تماس قبلی ثبت شده` : 'هنوز تماسی ثبت نشده'}
          </p>
        ) : (
          <div className="space-y-2">
            {calls.map((c) => {
              const Icon = resultIcon[c.result]
              return (
                <DetailRow
                  key={c.id}
                  icon={Icon}
                  value={resultLabels[c.result]}
                  meta={formatDuration(c.durationSec)}
                  sub={c.note ? c.note : relativeDayTime(c.createdAt)}
                />
              )
            })}
          </div>
        )}

        {followups.length > 0 && (
          <>
            <DetailDivider />
            <DetailSectionHeader icon={CalendarClock} title="پیگیری‌ها" count={toFa(followups.length)} />
            <div className="space-y-2">
              {followups.map((f) => (
                <DetailRow
                  key={f.id}
                  icon={Repeat2}
                  tone="accent"
                  value={f.title}
                  meta={relativeDayTime(f.dueAt)}
                />
              ))}
            </div>
          </>
        )}

        {(lead.statusHistory ?? []).length > 0 && (
          <>
            <DetailDivider />
            <DetailSectionHeader
              icon={ListTree}
              title="تاریخچه وضعیت"
              count={toFa((lead.statusHistory ?? []).length)}
            />
            <div className="relative space-y-3 pr-2 pt-1">
              <div className="absolute bottom-1 right-[15px] top-1 w-px bg-gradient-to-b from-[#3390EC]/30 via-[#3390EC]/15 to-transparent" />
              {[...(lead.statusHistory ?? [])]
                .reverse()
                .map((ev) => (
                  <div key={ev.id} className="relative flex items-start gap-3 pr-0">
                    <span className="relative z-10 mt-0.5 flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full bg-[#3390EC] ring-2 ring-white/80 shadow-[0_0_8px_rgba(51,144,236,0.45)] dark:bg-[#8774E1] dark:ring-black/30" />
                    <div className="min-w-0 flex-1 pb-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12px] font-extrabold text-neutral-800 dark:text-neutral-100">
                          {leadStatusLabels[ev.status]}
                        </p>
                        <span className="shrink-0 text-[10px] font-bold text-neutral-400 tabular-nums">
                          {relativeDayTime(ev.at)}
                        </span>
                      </div>
                      {ev.note && (
                        <p className="mt-0.5 text-[11px] font-semibold leading-5 text-neutral-500">{ev.note}</p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
