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
import { LeadProfileHero } from '@/components/domain/LeadProfileHero'
import { StageBar } from '@/components/domain/StageBar'
import { LeadStatusSheet } from '@/components/domain/LeadStatusSheet'
import { resultIcon } from '@/components/domain/icons'
import { LeadStatusBadge } from '@/components/domain/Badges'
import { EmptyState } from '@/components/ui/States'
import {
  experienceLabels,
  objectionLabels,
  resultLabels,
  leadStatusLabels,
} from '@/data/labels'
import { relativeDayTime, toFa, formatDuration } from '@/lib/format'
import { canCallLead } from '@/lib/leadUtils'
import { isLeadInScope } from '@/lib/teamUtils'
import { isManagementRole } from '@/lib/roles'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

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
          <div className="min-w-0 truncate text-[12px] font-bold text-neutral-800 dark:text-neutral-100">{value}</div>
          {meta && <span className="shrink-0 text-[10px] font-semibold text-[#8E8E93] tabular-nums dark:text-[#98989D]">{meta}</span>}
        </div>
        {sub && <p className="truncate text-[10px] font-semibold text-[#8E8E93] dark:text-[#98989D]">{sub}</p>}
      </div>
    </div>
  )
}

function DetailDivider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10" />
}

export function LeadDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const calls = useStore((s) => s.calls.filter((c) => c.leadId === id))
  const followups = useStore((s) => s.followups.filter((f) => f.leadId === id))
  const agents = useStore((s) => s.agents)
  const teams = useStore((s) => s.teams)
  const role = useStore((s) => s.role)
  const currentAgentId = useStore((s) => s.currentAgentId)
  const openCallMethodSheet = useStore((s) => s.openCallMethodSheet)
  const releaseLead = useStore((s) => s.releaseLead)
  const reclaimLead = useStore((s) => s.reclaimLead)
  const pushToast = useStore((s) => s.pushToast)
  const activeCallLeadId = useStore((s) => s.activeCallLeadId)
  const [statusOpen, setStatusOpen] = useState(false)

  const isTeamViewer = isManagementRole(role)

  if (!lead || !isLeadInScope(lead, teams, agents, currentAgentId, role)) {
    return (
      <Page withNav={false}>
        <TopBar title="جزئیات سرنخ" />
        <EmptyState title="سرنخ پیدا نشد" description="این سرنخ در دسترس نیست یا توسط کارشناس دیگری قفل شده." />
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
  const callable = !isTeamViewer && canCallLead(lead, currentAgentId) && !lead.returnedToPool
  const canRegisterResult = activeCallLeadId === lead.id

  return (
    <Page withNav={false} className="pb-28">
      <TopBar
        title={`${lead.firstName} ${lead.lastName}`}
        subtitle={lead.product}
        action={
          canRegisterResult ? (
            <button
              onClick={() => navigate(`/call-result/${lead.id}`)}
              className="glass-inset flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 shadow-sm transition-all active:scale-95 dark:text-neutral-300"
            >
              <ClipboardList size={18} strokeWidth={2.25} />
            </button>
          ) : undefined
        }
      />

      <div className="space-y-4 px-4">
        <LeadProfileHero lead={lead} />

        <div className="flex items-center justify-center">
          {lead.status && <LeadStatusBadge status={lead.status} />}
        </div>

        {lockedByOther && (
          <div className="glass-inset flex items-center gap-3 rounded-[22px] border border-error-200/60 px-4 py-3.5 dark:border-error-500/25">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error-500/12 text-error-600">
              <Lock size={18} strokeWidth={2.25} />
            </div>
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
            className="glass-inset flex items-center justify-center gap-1.5 rounded-[22px] border border-white/50 px-4 py-2.5 text-[12px] font-bold text-[#8E8E93] transition-all active:scale-[0.98] dark:border-white/10 dark:text-[#98989D]"
          >
            <Unlock size={13} />
            آزاد کردن قفل این سرنخ
          </button>
        )}

        {lead.returnedToPool && (
          <div className="glass-card rounded-[22px] border border-white/55 p-4 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="glass-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-neutral-500">
                <Undo2 size={18} strokeWidth={2.25} />
              </div>
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

        <div className="glass-card space-y-3 rounded-[26px] border border-white/55 p-4 dark:border-white/10">
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
                <div className="absolute bottom-1 right-[15px] top-1 w-px bg-gradient-to-b from-[#3390EC]/30 via-[#3390EC]/15 to-transparent" />
                {[...(lead.statusHistory ?? [])]
                  .reverse()
                  .map((ev) => (
                    <div key={ev.id} className="relative flex items-start gap-3 pr-0">
                      <span className="relative z-10 mt-0.5 flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full bg-[#3390EC] ring-2 ring-white/80 shadow-[0_0_8px_rgba(51,144,236,0.45)] dark:ring-black/30 dark:bg-[#8774E1]" />
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

      {!isTeamViewer && (
        <div className="glass-header absolute inset-x-0 bottom-0 z-20 flex gap-2.5 px-4 pt-3 pb-[calc(14px+var(--safe-bottom))]">
          <Button
            variant="soft"
            size="lg"
            className="glass-inset flex-1 border border-white/55 text-neutral-700 shadow-sm dark:border-white/10 dark:text-neutral-200"
            onClick={() => setStatusOpen(true)}
            icon={<Repeat2 size={18} />}
          >
            تغییر وضعیت
          </Button>
          <Button
            size="lg"
            className="flex-[1.4] bg-[#3390EC] shadow-[0_4px_16px_-4px_rgba(51,144,236,0.55)] dark:bg-[#8774E1] dark:shadow-[0_4px_16px_-4px_rgba(135,116,225,0.55)]"
            disabled={!callable}
            icon={callable ? <Phone size={18} /> : <Lock size={18} />}
            onClick={() => {
              if (!callable) return
              haptic('medium')
              openCallMethodSheet(lead)
            }}
          >
            {callable ? 'تماس بگیر' : lockedByOther ? 'قفل شده' : 'برگشت‌خورده'}
          </Button>
        </div>
      )}

      <LeadStatusSheet
        lead={lead}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        onReturnedToPool={() => navigate('/leads')}
      />
    </Page>
  )
}
