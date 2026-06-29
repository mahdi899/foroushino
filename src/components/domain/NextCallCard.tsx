import { motion } from 'framer-motion'
import { Phone, Clock, Target, NotebookPen, ChevronDown, TrendingUp, type LucideIcon } from 'lucide-react'
import type { Lead, LeadSource } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { ContactStatusBadge } from './Badges'
import { sourceIcon } from './icons'
import { sourceLabels } from '@/data/labels'
import { formatPhone } from '@/lib/format'
import { toFa } from '@/lib/format'

const sourceIconClass: Record<LeadSource, string> = {
  instagram: 'text-secondary-500',
  website: 'text-cold-500',
  telegram: 'text-cold-500',
  ads: 'text-accent-500',
  webinar: 'text-secondary-500',
  form: 'text-primary-500',
  excel: 'text-success-500',
}

interface NextCallCardProps {
  lead: Lead
  onCall: () => void
  onDetails: () => void
}

export function NextCallCard({ lead, onCall, onDetails }: NextCallCardProps) {
  const SourceIcon = sourceIcon[lead.source]

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', damping: 22, stiffness: 240 }}
      className="rounded-[28px] bg-surface p-5 shadow-card border border-border/60"
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-extrabold text-neutral-400">
          <Target size={15} className="text-primary-500" />
          سرنخ بعدی
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <Avatar id={lead.id} first={lead.firstName} last={lead.lastName} src={lead.avatar} size={64} online ring />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-extrabold text-neutral-900">
            {lead.firstName} {lead.lastName}
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <ContactStatusBadge temperature={lead.temperature} />
            <span className="ltr-nums text-sm font-bold text-primary-600 tabular-nums">
              {formatPhone(lead.phone)}
            </span>
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

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCall}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-primary-700 to-primary-500 text-base font-extrabold text-white shadow-float"
      >
        <Phone size={20} />
        تماس بگیر
      </motion.button>

      <button
        onClick={onDetails}
        className="mx-auto mt-2 flex items-center justify-center p-1 text-neutral-300"
      >
        <ChevronDown size={20} />
      </button>
    </motion.div>
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
