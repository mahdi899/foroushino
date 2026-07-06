import { Phone, Clock, Target, NotebookPen, ChevronDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { Lead, SuggestReason } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { ContactStatusBadge } from './Badges'
import { sourceIcon, sourceIconClass, suggestReasonIcon, suggestReasonChipLabel } from './icons'
import { sourceLabels } from '@/data/labels'
import { formatPhone, maskPhone, toFa } from '@/lib/format'
import { useStore } from '@/store/useStore'

interface NextCallCardProps {
  lead: Lead
  reason?: SuggestReason
  onCall: () => void
  onDetails: () => void
}

export function NextCallCard({ lead, reason, onCall, onDetails }: NextCallCardProps) {
  const SourceIcon = sourceIcon[lead.source]
  const ReasonIcon = reason ? suggestReasonIcon[reason] : null
  const maskPhoneNumbers = useStore((s) => s.maskPhoneNumbers)

  return (
    <div className="rounded-[28px] bg-surface p-5 shadow-card border border-border/60">
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-neutral-400">
          <Target size={15} className="text-primary-500" />
          سرنخ بعدی
        </span>
        {reason && ReasonIcon && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1.5 text-[11px] font-extrabold text-primary-700 ring-1 ring-primary-100/80">
            <ReasonIcon size={12} strokeWidth={2.5} />
            {suggestReasonChipLabel[reason]}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={64} online ring />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-extrabold text-neutral-900">
            {lead.firstName} {lead.lastName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ContactStatusBadge temperature={lead.temperature} />
            <div
              dir="ltr"
              className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-primary-50 px-2.5 py-1.5 ring-1 ring-primary-100/80"
            >
              <Phone size={13} strokeWidth={2.25} className="shrink-0 text-primary-500" />
              <span className="truncate text-[13px] font-extrabold tabular-nums tracking-wide text-primary-700">
                {maskPhoneNumbers ? maskPhone(lead.phone) : formatPhone(lead.phone)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-2xl bg-neutral-50 p-2">
        <MetaCell
          icon={Clock}
          iconClass="text-primary-500"
          value={lead.bestCallTime}
          label="بهترین زمان"
        />
        <MetaCell
          icon={TrendingUp}
          iconClass="text-success-500"
          value={`${toFa(lead.conversionProbability)}٪`}
          label="احتمال موفقیت"
          meter={lead.conversionProbability}
        />
        <MetaCell
          icon={SourceIcon}
          iconClass={sourceIconClass[lead.source]}
          value={sourceLabels[lead.source]}
          label="منبع سرنخ"
        />
      </div>

      {lead.interestReason && (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-border/70 p-3">
          <NotebookPen size={15} className="mt-0.5 shrink-0 text-primary-500" />
          <div>
            <p className="text-[11px] font-bold text-neutral-400">یادداشت سریع</p>
            <p className="mt-0.5 text-[13px] leading-6 text-neutral-700 line-clamp-2">
              {lead.interestReason}
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onCall}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-primary-700 to-primary-500 text-base font-extrabold text-white shadow-float transition-transform active:scale-[0.98]"
      >
        <Phone size={20} />
        تماس بگیر
      </button>

      <button
        type="button"
        onClick={onDetails}
        className="mx-auto mt-2 flex items-center justify-center p-1 text-neutral-300"
      >
        <ChevronDown size={20} />
      </button>
    </div>
  )
}

function MetaCell({
  icon: Icon,
  iconClass,
  value,
  label,
  meter,
}: {
  icon: LucideIcon
  iconClass: string
  value: string
  label: string
  meter?: number
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl bg-white px-1.5 py-3 text-center ring-1 ring-border/40">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-50">
        <Icon size={15} className={iconClass} strokeWidth={2.25} />
      </span>
      <div className="min-w-0 w-full">
        <p className="text-[11px] font-extrabold leading-tight text-neutral-800 line-clamp-2">{value}</p>
        {meter != null && (
          <div className="mx-auto mt-1.5 h-1 w-10 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-gradient-to-l from-primary-600 to-primary-400"
              style={{ width: `${Math.max(0, Math.min(100, meter))}%` }}
            />
          </div>
        )}
        <p className="mt-1 text-[10px] font-bold leading-tight text-neutral-400">{label}</p>
      </div>
    </div>
  )
}
