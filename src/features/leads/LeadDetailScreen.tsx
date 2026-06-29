import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Page } from '@/components/layout/Page'
import { TopBar } from '@/components/layout/TopBar'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Chip } from '@/components/ui/Chip'
import { ContactStatusBadge, SourceChip } from '@/components/domain/Badges'
import { StageBar } from '@/components/domain/StageBar'
import { resultIcon } from '@/components/domain/icons'
import { EmptyState } from '@/components/ui/States'
import {
  experienceLabels,
  objectionLabels,
  resultLabels,
  stageLabels,
  temperatureLabels,
} from '@/data/labels'
import { formatPhone, relativeDayTime, toFa, formatDuration } from '@/lib/format'
import { haptic } from '@/lib/telegram'
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

export function LeadDetailScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const lead = useStore((s) => s.leads.find((l) => l.id === id))
  const calls = useStore((s) => s.calls.filter((c) => c.leadId === id))
  const followups = useStore((s) => s.followups.filter((f) => f.leadId === id))
  const startCall = useStore((s) => s.startCall)
  const updateLeadStage = useStore((s) => s.updateLeadStage)
  const updateLeadTemperature = useStore((s) => s.updateLeadTemperature)
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
        <div className="flex flex-col items-center rounded-3xl bg-surface p-5 shadow-card border border-border/60">
          <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={76} online ring />
          <h2 className="mt-3 text-lg font-extrabold text-neutral-900">
            {lead.firstName} {lead.lastName}
          </h2>
          <p className="mt-0.5 text-sm font-bold text-primary-600 tabular-nums">
            {formatPhone(lead.phone)}
          </p>
          <p className="mt-1 text-xs text-neutral-400">{lead.city}</p>
          <div className="mt-3 flex items-center gap-2">
            <ContactStatusBadge temperature={lead.temperature} />
            <SourceChip source={lead.source} />
          </div>
        </div>

        <div className="rounded-3xl bg-surface p-4 shadow-card border border-border/60">
          <p className="mb-4 text-[13px] font-extrabold text-neutral-900">مرحله فروش</p>
          <StageBar stage={lead.stage} />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {info.map((item) => (
            <div key={item.label} className="rounded-2xl bg-surface p-3 shadow-card border border-border/60">
              <div className="flex items-center gap-1.5 text-neutral-400">
                <item.icon size={14} />
                <span className="text-[11px] font-bold">{item.label}</span>
              </div>
              <p className="mt-1 text-[13px] font-extrabold text-neutral-800">{item.value}</p>
            </div>
          ))}
        </div>

        {(lead.painPoint || lead.objection) && (
          <div className="space-y-2.5">
            {lead.painPoint && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-warning-50 p-3.5">
                <AlertCircle size={17} className="mt-0.5 shrink-0 text-warning-600" />
                <div>
                  <p className="text-[11px] font-bold text-warning-600">نیاز اصلی</p>
                  <p className="mt-0.5 text-[13px] font-bold text-neutral-700">{lead.painPoint}</p>
                </div>
              </div>
            )}
            {lead.objection && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-error-50 p-3.5">
                <MessageSquareWarning size={17} className="mt-0.5 shrink-0 text-error-600" />
                <div>
                  <p className="text-[11px] font-bold text-error-600">اعتراض احتمالی</p>
                  <p className="mt-0.5 text-[13px] font-bold text-neutral-700">
                    {objectionLabels[lead.objection]}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {lead.lastNote && (
          <div className="rounded-2xl bg-surface p-4 shadow-card border border-border/60">
            <p className="mb-1 text-[13px] font-extrabold text-neutral-900">آخرین یادداشت</p>
            <p className="text-[13px] leading-6 text-neutral-600">{lead.lastNote}</p>
          </div>
        )}

        <div className="rounded-3xl bg-surface p-4 shadow-card border border-border/60">
          <p className="mb-3 text-[13px] font-extrabold text-neutral-900">تاریخچه تماس‌ها</p>
          {calls.length === 0 ? (
            <p className="py-3 text-center text-xs font-bold text-neutral-400">
              {lead.callCount > 0
                ? `${toFa(lead.callCount)} تماس قبلی ثبت شده`
                : 'هنوز تماسی ثبت نشده'}
            </p>
          ) : (
            <div className="space-y-3">
              {calls.map((c) => {
                const Icon = resultIcon[c.result]
                return (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                        <Icon size={16} />
                      </div>
                    </div>
                    <div className="flex-1 border-b border-border/60 pb-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-extrabold text-neutral-800">
                          {resultLabels[c.result]}
                        </p>
                        <span className="text-[11px] font-bold text-neutral-400 tabular-nums">
                          {formatDuration(c.durationSec)}
                        </span>
                      </div>
                      {c.note && <p className="mt-0.5 text-xs text-neutral-500">{c.note}</p>}
                      <p className="mt-1 text-[10px] font-bold text-neutral-300">
                        {relativeDayTime(c.createdAt)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {followups.length > 0 && (
          <div className="rounded-3xl bg-surface p-4 shadow-card border border-border/60">
            <p className="mb-3 text-[13px] font-extrabold text-neutral-900">پیگیری‌ها</p>
            <div className="space-y-2">
              {followups.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-2xl bg-neutral-50 p-3">
                  <span className="text-[13px] font-bold text-neutral-700">{f.title}</span>
                  <span className="text-[11px] font-bold text-neutral-400">
                    {relativeDayTime(f.dueAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 flex gap-2.5 border-t border-border/60 bg-surface/90 glass px-4 pt-3 pb-[calc(14px+var(--safe-bottom))]">
        <Button variant="soft" size="lg" className="flex-1" onClick={() => setStatusOpen(true)} icon={<Repeat2 size={18} />}>
          تغییر وضعیت
        </Button>
        <Button
          size="lg"
          className="flex-[1.4]"
          icon={<Phone size={18} />}
          onClick={() => {
            haptic('medium')
            startCall(lead.id)
            navigate(`/dialer/${lead.id}`)
          }}
        >
          تماس بگیر
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
        </div>
      </BottomSheet>
    </Page>
  )
}
