import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Phone,
  ClipboardList,
  Repeat2,
  Wallet,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  MessageSquareWarning,
  PhoneCall,
  NotebookPen,
  History,
  CalendarClock,
  Lock,
  Undo2,
  RotateCcw,
  Unlock,
  ListTree,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Chip } from '@/components/ui/Chip'
import { LeadProfileHero } from '@/components/domain/LeadProfileHero'
import { StageBar } from '@/components/domain/StageBar'
import { resultIcon } from '@/components/domain/icons'
import { LeadStatusBadge } from '@/components/domain/Badges'
import { EmptyState } from '@/components/ui/States'
import {
  experienceLabels,
  objectionLabels,
  resultLabels,
  stageLabels,
  temperatureLabels,
  leadStatusLabels,
} from '@/data/labels'
import { relativeDayTime, toFa, formatDuration } from '@/lib/format'
import { canCallLead } from '@/lib/leadUtils'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'
import type { SaleStage, Temperature } from '@/types'

const stageOptions: SaleStage[] = [
  'new',
  'first_call',
  'interested',
  'follow_up',
  'meeting',
  'payment_pending',
  'won',
  'lost',
]
const tempOptions: Temperature[] = ['hot', 'warm', 'cold']

function DetailIconBox({
  icon: Icon,
  tone = 'primary',
}: {
  icon: LucideIcon
  tone?: 'primary' | 'warning' | 'error' | 'accent'
}) {
  const tones = {
    primary: 'text-primary-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
    accent: 'text-accent-600',
  }
  return (
    <div
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface shadow-sm',
        tones[tone],
      )}
    >
      <Icon size={15} />
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
      <p className="text-[13px] font-extrabold text-neutral-900">{title}</p>
      {count !== undefined && (
        <span className="mr-auto rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-extrabold text-neutral-500 tabular-nums">
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
    <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-2.5 py-2">
      <DetailIconBox icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        {label && <p className="text-[10px] font-bold text-neutral-400">{label}</p>}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-[12px] font-extrabold text-neutral-800">{value}</div>
          {meta && <span className="shrink-0 text-[10px] font-bold text-neutral-400 tabular-nums">{meta}</span>}
        </div>
        {sub && <p className="truncate text-[10px] font-bold text-neutral-400">{sub}</p>}
      </div>
    </div>
  )
}

function DetailDivider() {
  return <div className="h-px bg-border/60" />
}

export function LeadDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const calls = useStore((s) => s.calls.filter((c) => c.leadId === id))
  const followups = useStore((s) => s.followups.filter((f) => f.leadId === id))
  const agents = useStore((s) => s.agents)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const startCall = useStore((s) => s.startCall)
  const updateLeadStage = useStore((s) => s.updateLeadStage)
  const updateLeadTemperature = useStore((s) => s.updateLeadTemperature)
  const releaseLead = useStore((s) => s.releaseLead)
  const returnLeadToPool = useStore((s) => s.returnLeadToPool)
  const reclaimLead = useStore((s) => s.reclaimLead)
  const pushToast = useStore((s) => s.pushToast)
  const [statusOpen, setStatusOpen] = useState(false)

  if (!lead) {
    return (
      <Page withNav={false}>
        <TopBar title="جزئیات سرنخ" />
        <EmptyState title="سرنخ پیدا نشد" />
      </Page>
    )
  }

  const info = [
    { icon: Wallet, label: 'بودجه حدودی', value: lead.budget },
    { icon: Briefcase, label: 'شغل فعلی', value: lead.job },
    { icon: GraduationCap, label: 'تجربه', value: experienceLabels[lead.experience] },
    { icon: Target, label: 'هدف درآمدی', value: lead.incomeGoal },
    { icon: Clock, label: 'زمان تماس', value: lead.bestCallTime },
    { icon: TrendingUp, label: 'احتمال تبدیل', value: `${toFa(lead.conversionProbability)}٪` },
  ]

  const lockedByOther = !!lead.lockedBy && lead.lockedBy !== currentAgentId
  const lockedByMe = !!lead.lockedBy && lead.lockedBy === currentAgentId
  const lockAgent = lockedByOther ? agents.find((a) => a.id === lead.lockedBy) : null
  const callable = canCallLead(lead, currentAgentId) && !lead.returnedToPool

  return (
    <Page withNav={false} className="pb-28">
      <TopBar
        title={`${lead.firstName} ${lead.lastName}`}
        subtitle={lead.product}
        action={
          <button
            onClick={() => navigate(`/call-result/${lead.id}`)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-surface shadow-card border border-border/60 text-neutral-600"
          >
            <ClipboardList size={18} />
          </button>
        }
      />

      <div className="space-y-4 px-4">
        <LeadProfileHero lead={lead} />

        <div className="flex items-center justify-center">
          {lead.status && <LeadStatusBadge status={lead.status} />}
        </div>

        {lockedByOther && (
          <div className="flex items-center gap-3 rounded-2xl border border-error-200/70 bg-error-50 px-4 py-3.5">
            <Lock size={18} className="shrink-0 text-error-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-extrabold text-error-700">
                {lockAgent ? `قفل توسط ${lockAgent.firstName} ${lockAgent.lastName}` : 'قفل شده توسط نیروی دیگر'}
              </p>
              <p className="mt-0.5 text-[11px] font-bold text-error-500">
                تا آزاد شدن قفل صبر کن یا سراغ سرنخ بعدی برو.
              </p>
            </div>
          </div>
        )}

        {lockedByMe && (
          <button
            onClick={() => {
              haptic('light')
              releaseLead(lead.id)
              pushToast('قفل لید آزاد شد')
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/60 bg-surface px-4 py-2.5 text-[12px] font-extrabold text-neutral-500"
          >
            <Unlock size={13} />
            آزاد کردن قفل این سرنخ
          </button>
        )}

        {lead.returnedToPool && (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <Undo2 size={18} className="shrink-0 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold text-neutral-700">این سرنخ به صف عمومی برگشته</p>
                <p className="mt-0.5 text-[11px] font-bold text-neutral-400">
                  برای تماس مجدد، ابتدا آن را بازپس بگیر.
                </p>
              </div>
            </div>
            <Button
              full
              size="sm"
              className="mt-3"
              icon={<RotateCcw size={14} />}
              onClick={() => {
                haptic('success')
                reclaimLead(lead.id)
                pushToast('لید دوباره به تو اختصاص داده شد')
              }}
            >
              بازپس‌گیری این لید
            </Button>
          </div>
        )}

        <StageBar stage={lead.stage} />

        <div className="space-y-3 rounded-3xl border border-border/60 bg-surface p-3 shadow-card">
          <div className="grid grid-cols-2 gap-2">
            {info.map((item) => (
              <DetailRow key={item.label} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </div>

          {(lead.painPoint || lead.objection || lead.lastNote) && (
            <>
              <DetailDivider />
              <div className="space-y-2">
                {lead.painPoint && (
                  <DetailRow
                    icon={AlertCircle}
                    tone="warning"
                    label="نیاز اصلی"
                    value={lead.painPoint}
                  />
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
          <DetailSectionHeader
            icon={History}
            title="تاریخچه تماس"
            count={toFa(calls.length || lead.callCount)}
          />
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
                <div className="absolute bottom-1 right-[15px] top-1 w-px bg-border" />
                {[...(lead.statusHistory ?? [])]
                  .reverse()
                  .map((ev) => (
                    <div key={ev.id} className="relative flex items-start gap-3 pr-0">
                      <span className="relative z-10 mt-0.5 flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full border-2 border-surface bg-primary-500 shadow-sm" />
                      <div className="min-w-0 flex-1 pb-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[12px] font-extrabold text-neutral-800">
                            {leadStatusLabels[ev.status]}
                          </p>
                          <span className="shrink-0 text-[10px] font-bold text-neutral-400 tabular-nums">
                            {relativeDayTime(ev.at)}
                          </span>
                        </div>
                        {ev.note && (
                          <p className="mt-0.5 text-[11px] font-bold text-neutral-400">{ev.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex gap-2.5 border-t border-border/60 bg-surface/90 glass px-4 pt-3 pb-[calc(14px+var(--safe-bottom))]">
        <Button variant="soft" size="lg" className="flex-1" onClick={() => setStatusOpen(true)} icon={<Repeat2 size={18} />}>
          تغییر وضعیت
        </Button>
        <Button
          size="lg"
          className="flex-[1.4]"
          disabled={!callable}
          icon={callable ? <Phone size={18} /> : <Lock size={18} />}
          onClick={() => {
            if (!callable) return
            haptic('medium')
            startCall(lead.id)
            navigate(`/dialer/${lead.id}`)
          }}
        >
          {callable ? 'تماس بگیر' : lockedByOther ? 'قفل شده' : 'برگشت‌خورده'}
        </Button>
      </div>

      <BottomSheet open={statusOpen} onClose={() => setStatusOpen(false)} title="تغییر وضعیت سرنخ">
        <div className="space-y-4 pt-1">
          <div>
            <p className="mb-2 text-xs font-bold text-neutral-500">سطح علاقه</p>
            <div className="flex gap-2">
              {tempOptions.map((t) => (
                <Chip
                  key={t}
                  active={lead.temperature === t}
                  onClick={() => {
                    updateLeadTemperature(lead.id, t)
                    pushToast('سطح علاقه به‌روزرسانی شد')
                  }}
                >
                  {temperatureLabels[t]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold text-neutral-500">مرحله فروش</p>
            <div className="flex flex-wrap gap-2">
              {stageOptions.map((s) => (
                <Chip
                  key={s}
                  active={lead.stage === s}
                  onClick={() => {
                    updateLeadStage(lead.id, s)
                    pushToast('مرحله فروش به‌روزرسانی شد')
                  }}
                >
                  {stageLabels[s]}
                </Chip>
              ))}
            </div>
          </div>
          <Button full size="lg" icon={<PhoneCall size={18} />} onClick={() => setStatusOpen(false)}>
            تایید
          </Button>

          {!lockedByOther && !lead.returnedToPool && lead.stage !== 'won' && lead.stage !== 'lost' && (
            <button
              onClick={() => {
                haptic('warning')
                returnLeadToPool(lead.id)
                pushToast('لید به صف عمومی برگشت')
                setStatusOpen(false)
                navigate('/leads')
              }}
              className="flex w-full items-center justify-center gap-1.5 py-1 text-[13px] font-bold text-error-500"
            >
              <Undo2 size={15} />
              بازگشت این سرنخ به صف عمومی
            </button>
          )}
        </div>
      </BottomSheet>
    </Page>
  )
}
