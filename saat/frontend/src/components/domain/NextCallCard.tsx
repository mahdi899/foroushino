import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone,
  Clock,
  ChevronLeft,
  SkipForward,
  Repeat2,
  NotebookPen,
  type LucideIcon,
} from 'lucide-react'
import type { Lead, SuggestReason } from '@/types'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { ContactStatusBadge } from './Badges'
import { LeadStatusSheet } from './LeadStatusSheet'
import { sourceIcon, sourceIconClass, suggestReasonIcon, suggestReasonChipLabel } from './icons'
import { sourceLabels, suggestReasonActionHint } from '@/data/labels'
import { formatPhone, maskPhone, toFa } from '@/lib/format'
import { leadDisplayCode } from '@/lib/leadCode'
import { useStore } from '@/store/useStore'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'

const reasonBannerStyle: Partial<Record<SuggestReason, string>> = {
  overdue_follow_up:
    'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200',
  hot_in_window:
    'border-orange-500/30 bg-orange-500/10 text-orange-800 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-200',
  today_follow_up:
    'border-[#3390EC]/25 bg-[#3390EC]/10 text-[#1a6fb8] dark:border-[#8774E1]/28 dark:bg-[#8774E1]/12 dark:text-[#c4b8f0]',
}

interface NextCallCardProps {
  lead: Lead
  reason?: SuggestReason
  onCall: () => void
  onDetails?: () => void
  onSkip?: () => void
  canSkip?: boolean
}

export function NextCallCard({ lead, reason, onCall, onDetails, onSkip, canSkip = false }: NextCallCardProps) {
  const navigate = useNavigate()
  const [statusOpen, setStatusOpen] = useState(false)
  const SourceIcon = sourceIcon[lead.source]
  const ReasonIcon = reason ? suggestReasonIcon[reason] : null
  const maskPhoneNumbers = useStore((s) => s.maskPhoneNumbers)
  const prob = Math.max(0, Math.min(100, lead.conversionProbability))

  const secondaryActions: { id: string; label: string; icon: LucideIcon; onClick: () => void }[] = [
    {
      id: 'details',
      label: 'جزئیات',
      icon: ChevronLeft,
      onClick: () => {
        haptic('light')
        if (onDetails) onDetails()
        else navigate(`/leads/${lead.id}`)
      },
    },
    ...(canSkip && onSkip
      ? [
          {
            id: 'skip',
            label: 'رد کردن',
            icon: SkipForward,
            onClick: () => {
              haptic('selection')
              onSkip()
            },
          },
        ]
      : []),
    {
      id: 'status',
      label: 'وضعیت',
      icon: Repeat2,
      onClick: () => {
        haptic('light')
        setStatusOpen(true)
      },
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className="glass-card overflow-hidden rounded-[22px] border border-white/60 dark:border-white/10"
    >
      {/* Why now — coaching banner */}
      {reason && ReasonIcon && (
        <div
          className={cn(
            'flex items-start gap-2.5 border-b px-4 py-3',
            reasonBannerStyle[reason] ??
              'border-[#3390EC]/15 bg-[#3390EC]/6 text-[#1a6fb8] dark:border-[#8774E1]/18 dark:bg-[#8774E1]/8 dark:text-[#c4b8f0]',
          )}
        >
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/50 dark:bg-white/10">
            <ReasonIcon size={16} strokeWidth={2.35} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-snug">{suggestReasonChipLabel[reason]}</p>
            <p className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-85">
              {suggestReasonActionHint[reason]}
            </p>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Lead identity */}
        <div className="flex items-center gap-3">
          <LeadAvatar lead={lead} size={52} ring showTempBadge />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[18px] font-bold leading-snug text-text">
              {lead.firstName} {lead.lastName}
            </h2>
            <p className="mt-0.5 text-[11px] font-semibold text-text-soft">
              کد مشتری{' '}
              <span dir="ltr" className="font-bold tracking-wide text-text tabular-nums">
                {leadDisplayCode(lead)}
              </span>
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <ContactStatusBadge temperature={lead.temperature} size="sm" />
              <span className="text-[11px] font-semibold tabular-nums text-text-soft">
                {toFa(prob)}٪ احتمال
              </span>
            </div>
          </div>
        </div>

        {/* Context row */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-text-muted">
          <span
            dir="ltr"
            className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-1 tabular-nums dark:bg-white/[0.06]"
          >
            <Phone size={10} className={TG} strokeWidth={2.25} />
            {maskPhoneNumbers ? maskPhone(lead.phone) : formatPhone(lead.phone)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-1 dark:bg-white/[0.06]">
            <Clock size={11} className={TG} strokeWidth={2.25} />
            {lead.bestCallTime}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-1 dark:bg-white/[0.06]">
            <SourceIcon size={11} className={sourceIconClass[lead.source]} strokeWidth={2.25} />
            {sourceLabels[lead.source]}
          </span>
        </div>

        {lead.interestReason && (
          <div className="mt-2.5 flex items-start gap-2 rounded-[12px] bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]">
            <NotebookPen size={14} className={cn('mt-0.5 shrink-0', TG)} strokeWidth={2.25} />
            <p className="text-[12px] leading-[1.55] text-text-muted line-clamp-2">{lead.interestReason}</p>
          </div>
        )}

        {/* Primary CTA */}
        <motion.button
          type="button"
          onClick={onCall}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'mt-3 flex h-[52px] w-full items-center justify-center gap-2',
            'rounded-[14px] text-[16px] font-bold text-white',
            'bg-[#3390EC] shadow-[0_6px_20px_rgba(51,144,236,0.28)]',
            'dark:bg-[#8774E1] dark:shadow-[0_6px_20px_rgba(135,116,225,0.24)]',
          )}
        >
          <Phone size={19} strokeWidth={2.35} />
          تماس بگیر
        </motion.button>

        {/* Secondary actions — compact text row */}
        <div className="mt-2 flex items-center justify-center gap-1">
          {secondaryActions.map((action, i) => {
            const Icon = action.icon
            return (
              <div key={action.id} className="flex items-center">
                {i > 0 && <span className="mx-1 text-text-soft/40">·</span>}
                <button
                  type="button"
                  onClick={action.onClick}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-text-muted active:bg-black/[0.04] dark:active:bg-white/[0.06]"
                >
                  <Icon size={13} strokeWidth={2.25} />
                  {action.label}
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <LeadStatusSheet lead={lead} open={statusOpen} onClose={() => setStatusOpen(false)} />
    </motion.div>
  )
}
