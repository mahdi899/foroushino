import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Phone,
  Clock,
  Target,
  NotebookPen,
  TrendingUp,
  ClipboardList,
  Repeat2,
  ChevronLeft,
  SkipForward,
  type LucideIcon,
} from 'lucide-react'
import type { Lead, SuggestReason } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { ContactStatusBadge } from './Badges'
import { LeadStatusSheet } from './LeadStatusSheet'
import { sourceIcon, sourceIconClass, suggestReasonIcon, suggestReasonChipLabel } from './icons'
import { sourceLabels } from '@/data/labels'
import { formatPhone, maskPhone, toFa } from '@/lib/format'
import { useStore } from '@/store/useStore'
import { haptic } from '@/lib/telegram'
import { cn } from '@/lib/cn'

const TG = 'text-[#3390EC] dark:text-[#8774E1]'

const reasonChipStyle: Partial<Record<SuggestReason, string>> = {
  overdue_follow_up:
    'border-amber-500/25 bg-amber-500/12 text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/14 dark:text-amber-300',
  hot_in_window:
    'border-orange-500/25 bg-orange-500/12 text-orange-700 dark:border-orange-400/30 dark:bg-orange-400/14 dark:text-orange-300',
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

  const quickActions = [
    {
      id: 'result',
      label: 'ثبت نتیجه',
      icon: ClipboardList,
      onClick: () => {
        haptic('light')
        navigate(`/call-result/${lead.id}`)
      },
    },
    {
      id: 'status',
      label: 'تغییر وضعیت',
      icon: Repeat2,
      onClick: () => {
        haptic('light')
        setStatusOpen(true)
      },
    },
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
            label: 'سرنخ بعدی',
            icon: SkipForward,
            onClick: () => {
              haptic('selection')
              onSkip()
            },
          },
        ]
      : []),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className="glass-card relative overflow-hidden rounded-[26px] border border-white/60 p-[18px] dark:border-white/10"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-8 top-6 h-32 w-32 rounded-full bg-[#3390EC]/14 blur-3xl" />
        <div className="absolute -bottom-10 -right-6 h-28 w-28 rounded-full bg-[#8774E1]/10 blur-3xl" />
        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/15" />
      </div>

      {/* Header */}
      <div className="relative mb-3.5 flex items-center justify-between gap-2">
        <div
          className={cn(
            'glass-inset flex items-center gap-2 rounded-full border border-white/55 py-1.5 pl-2 pr-3.5',
            'dark:border-white/10',
          )}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3390EC]/14 dark:bg-[#8774E1]/18">
            <Target size={13} className={TG} strokeWidth={2.35} />
          </span>
          <span className="text-[12px] font-semibold tracking-tight text-text-muted">سرنخ بعدی</span>
        </div>

        {reason && ReasonIcon && (
          <span
            className={cn(
              'inline-flex max-w-[48%] items-center gap-1.5 rounded-full border px-2.5 py-1',
              'text-[10px] font-semibold backdrop-blur-md',
              reasonChipStyle[reason] ??
                cn(
                  'border-[#3390EC]/22 bg-[#3390EC]/10 dark:border-[#8774E1]/28 dark:bg-[#8774E1]/12',
                  TG,
                ),
            )}
          >
            <ReasonIcon size={11} strokeWidth={2.5} className="shrink-0" />
            <span className="truncate">{suggestReasonChipLabel[reason]}</span>
          </span>
        )}
      </div>

      {/* Profile panel */}
      <div
        className={cn(
          'relative mb-2.5 overflow-hidden rounded-[18px] border border-white/50 p-2.5',
          'glass-inset dark:border-white/10',
        )}
      >
        <div className="pointer-events-none absolute -left-6 top-0 h-20 w-20 rounded-full bg-[#3390EC]/10 blur-2xl" />

        <div className="relative flex items-start gap-2.5">
          <div className="relative shrink-0">
            <ProbabilityRing value={prob} id={lead.id} />
            <div className="absolute inset-[11px] flex items-center justify-center">
              <Avatar
                id={lead.id}
                first={lead.firstName}
                last={lead.lastName}
                src={lead.avatar}
                size={58}
                online
                ring
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="truncate text-[18px] font-bold leading-snug text-text">
              {lead.firstName} {lead.lastName}
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-1">
              <ContactStatusBadge temperature={lead.temperature} size="sm" />
              <span className="text-[11px] font-semibold tabular-nums text-text-soft">
                {toFa(prob)}٪ احتمال
              </span>
            </div>

            <div
              dir="ltr"
              className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-white/40 px-2 py-1 dark:bg-white/[0.07]"
            >
              <Phone size={12} className={cn('shrink-0', TG)} strokeWidth={2.35} />
              <span className="truncate text-[13px] font-semibold tabular-nums tracking-wide text-text">
                {maskPhoneNumbers ? maskPhone(lead.phone) : formatPhone(lead.phone)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div
        className={cn(
          'relative grid grid-cols-3 gap-1 rounded-[18px] border border-white/50 p-1',
          'glass-inset dark:border-white/10',
        )}
      >
        <MetaCell
          icon={Clock}
          iconClass={TG}
          iconWrap="bg-[#3390EC]/12 dark:bg-[#8774E1]/16"
          value={lead.bestCallTime}
          label="بهترین زمان"
        />
        <MetaCell
          icon={TrendingUp}
          iconClass="text-emerald-600 dark:text-emerald-400"
          iconWrap="bg-emerald-500/12 dark:bg-emerald-400/14"
          value={`${toFa(prob)}٪`}
          label="احتمال"
          meter={prob}
        />
        <MetaCell
          icon={SourceIcon}
          iconClass={sourceIconClass[lead.source]}
          iconWrap="bg-violet-500/12 dark:bg-violet-400/14"
          value={sourceLabels[lead.source]}
          label="منبع"
        />
      </div>

      {lead.interestReason && (
        <div
          className={cn(
            'relative mt-2.5 flex items-start gap-2.5 rounded-[16px] border border-white/50 p-3',
            'glass-inset dark:border-white/10',
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-white/45 dark:bg-white/10">
            <NotebookPen size={15} className={TG} strokeWidth={2.25} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-soft">یادداشت</p>
            <p className="mt-0.5 text-[13px] leading-[1.55] text-text-muted line-clamp-2">
              {lead.interestReason}
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          'relative mt-2.5 grid gap-1 rounded-[18px] border border-white/50 p-1',
          'glass-inset dark:border-white/10',
          canSkip && onSkip ? 'grid-cols-4' : 'grid-cols-3',
        )}
      >
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <motion.button
              key={action.id}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={action.onClick}
              className={cn(
                'flex min-w-0 flex-col items-center gap-1.5 rounded-[14px] px-1 py-2.5',
                'bg-white/30 transition-colors active:bg-white/50 dark:bg-white/[0.05] dark:active:bg-white/10',
              )}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#3390EC]/12 dark:bg-[#8774E1]/16">
                <Icon size={16} className={TG} strokeWidth={2.25} />
              </span>
              <span className="w-full truncate text-center text-[10px] font-semibold text-text-muted">
                {action.label}
              </span>
            </motion.button>
          )
        })}
      </div>

      <motion.button
        type="button"
        onClick={onCall}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'relative mt-3 flex h-[54px] w-full items-center justify-center gap-2 overflow-hidden',
          'rounded-[15px] text-[16px] font-semibold text-white',
          'bg-[#3390EC] shadow-[0_8px_24px_rgba(51,144,236,0.32)]',
          'dark:bg-[#8774E1] dark:shadow-[0_8px_24px_rgba(135,116,225,0.28)]',
        )}
      >
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10" />
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/35" />
        <Phone size={19} className="relative" strokeWidth={2.35} />
        <span className="relative">تماس بگیر</span>
      </motion.button>

      <LeadStatusSheet lead={lead} open={statusOpen} onClose={() => setStatusOpen(false)} />
    </motion.div>
  )
}

function ProbabilityRing({ value, id }: { value: number; id: string }) {
  const size = 80
  const center = size / 2
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (value / 100) * c
  const gradId = `probGrad-${id}`

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={center} cy={center} r={r} fill="none" stroke="rgba(120,120,128,0.12)" strokeWidth="3.5" />
      <motion.circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3390EC" />
          <stop offset="100%" stopColor="#8774E1" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function MetaCell({
  icon: Icon,
  iconWrap,
  iconClass,
  value,
  label,
  meter,
}: {
  icon: LucideIcon
  iconWrap: string
  iconClass: string
  value: string
  label: string
  meter?: number
}) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-[14px] bg-white/30 px-1 py-2.5 text-center dark:bg-white/[0.05]">
      <span className={cn('mb-1.5 flex h-8 w-8 items-center justify-center rounded-[10px]', iconWrap)}>
        <Icon size={14} className={iconClass} strokeWidth={2.25} />
      </span>
      <p className="w-full truncate px-0.5 text-[11px] font-bold leading-tight text-text">{value}</p>
      {meter != null && (
        <div className="mx-auto mt-1 h-[3px] w-10 overflow-hidden rounded-full bg-black/[0.06] dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-[#3390EC] to-[#5EB0FF] dark:from-[#8774E1] dark:to-[#A894EE]"
            initial={{ width: 0 }}
            animate={{ width: `${meter}%` }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.15 }}
          />
        </div>
      )}
      <p className="mt-1 text-[9px] font-semibold text-text-soft">{label}</p>
    </div>
  )
}
