import { MapPin, Phone, Clock, Flame, Sun, Snowflake, Lock, Info, Undo2, UserRound } from 'lucide-react'
import type { Lead, LeadSource, Temperature } from '@/types'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { PriorityBadge } from './Badges'
import { sourceBadgeClass, sourceIcon } from './icons'
import { relativeDayTime, isToday, toFa } from '@/lib/format'
import { temperatureLabels } from '@/data/labels'
import { cn } from '@/lib/cn'

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
  onCall?: () => void
  onQuickView?: () => void
  lockedByName?: string
  assignedAgentLabel?: string | null
}

const sourceTone = Object.fromEntries(
  Object.entries(sourceBadgeClass).map(([k, v]) => [k, `${v} text-white`]),
) as Record<LeadSource, string>

const tempTheme: Record<Temperature, { glow: string; pill: string }> = {
  hot: {
    glow: 'bg-hot-400/18',
    pill: 'bg-hot-500/12 text-hot-600 dark:bg-hot-400/14 dark:text-hot-400',
  },
  warm: {
    glow: 'bg-warm-400/14',
    pill: 'bg-warm-500/12 text-warm-700 dark:bg-warm-400/14 dark:text-warm-400',
  },
  cold: {
    glow: 'bg-cold-400/12',
    pill: 'bg-cold-500/12 text-cold-600 dark:bg-cold-400/14 dark:text-cold-400',
  },
}

const tempIcon = { hot: Flame, warm: Sun, cold: Snowflake }

export function LeadCard({ lead, onClick, onCall, onQuickView, lockedByName, assignedAgentLabel }: LeadCardProps) {
  const SourceIcon = sourceIcon[lead.source]
  const TempIcon = tempIcon[lead.temperature]
  const theme = tempTheme[lead.temperature]
  const overdue =
    lead.nextFollowupAt != null && new Date(lead.nextFollowupAt).getTime() < Date.now()
  const followupToday = lead.nextFollowupAt != null && isToday(lead.nextFollowupAt)
  const lockedByOther = !!lockedByName
  const returned = !!lead.returnedToPool

  return (
    <article
      onClick={onClick}
      className={cn(
        'group glass-card relative cursor-pointer overflow-hidden rounded-[18px] border border-white/55',
        'transition-transform active:scale-[0.99] dark:border-white/10',
        lockedByOther && 'ring-1 ring-error-400/25',
      )}
    >
      <div className={cn('pointer-events-none absolute -left-6 -top-6 h-24 w-24 rounded-full blur-2xl', theme.glow)} />
      <div className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/12" />

      <div className="relative p-3">
        <div className="flex items-start gap-2.5">
          <div className="relative shrink-0">
            <LeadAvatar lead={lead} size={48} ring />
            <span
              className={cn(
                'absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white dark:ring-[#232E38]',
                sourceTone[lead.source],
              )}
            >
              <SourceIcon size={10} strokeWidth={2.5} />
            </span>
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-[15px] font-bold leading-snug text-text">
                {lead.firstName} {lead.lastName}
              </h3>
              {lead.priority > 1 && <PriorityBadge priority={lead.priority} />}
            </div>

            {lead.city && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-text-soft">
                <MapPin size={10} className="shrink-0 opacity-70" strokeWidth={2.25} />
                <span className="truncate">{lead.city}</span>
              </p>
            )}

            {lead.lastNote && (
              <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-text-muted">{lead.lastNote}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {onQuickView && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickView()
                }}
                aria-label="پیش‌نمایش سریع"
                className="glass-inset flex h-8 w-8 items-center justify-center rounded-full border border-white/50 text-text-soft dark:border-white/10"
              >
                <Info size={14} strokeWidth={2.25} />
              </button>
            )}
            <button
              type="button"
              disabled={lockedByOther}
              onClick={(e) => {
                e.stopPropagation()
                onCall?.()
              }}
              aria-label={`تماس با ${lead.firstName} ${lead.lastName}`}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90',
                lockedByOther
                  ? 'glass-inset text-text-soft'
                  : cn(
                      'bg-[#3390EC] text-white shadow-[0_4px_14px_rgba(51,144,236,0.32)]',
                      'dark:bg-[#8774E1] dark:shadow-[0_4px_14px_rgba(135,116,225,0.28)]',
                    ),
              )}
            >
              {lockedByOther ? (
                <Lock size={15} strokeWidth={2.25} />
              ) : (
                <Phone size={16} strokeWidth={2.35} />
              )}
            </button>
          </div>
        </div>

        {(lockedByOther || returned || assignedAgentLabel) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {assignedAgentLabel && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#3390EC]/20 bg-[#3390EC]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3390EC] dark:text-[#8774E1]">
                <UserRound size={10} />
                {assignedAgentLabel}
              </span>
            )}
            {lockedByOther && (
              <span className="inline-flex items-center gap-1 rounded-full border border-error-400/25 bg-error-500/10 px-2 py-0.5 text-[10px] font-semibold text-error-600 dark:text-error-400">
                <Lock size={10} />
                قفل: {lockedByName}
              </span>
            )}
            {returned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/50 bg-white/35 px-2 py-0.5 text-[10px] font-semibold text-text-soft dark:border-white/10 dark:bg-white/[0.06]">
                <Undo2 size={10} />
                برگشت‌خورده
              </span>
            )}
          </div>
        )}

        <div
          className={cn(
            'mt-2 flex items-center justify-between gap-2 rounded-[12px] border border-white/45 px-2 py-1.5',
            'glass-inset dark:border-white/10',
            overdue && 'border-error-400/20 bg-error-500/[0.06]',
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span className={cn('inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold', theme.pill)}>
              <TempIcon size={10} strokeWidth={2.5} />
              {temperatureLabels[lead.temperature]}
            </span>

            {lead.nextFollowupAt && (
              <>
                <span className="h-2.5 w-px shrink-0 bg-black/10 dark:bg-white/10" aria-hidden />
                <span
                  className={cn(
                    'flex min-w-0 items-center gap-0.5 truncate text-[10px] font-semibold',
                    overdue ? 'text-error-600 dark:text-error-400' : followupToday ? 'text-[#3390EC] dark:text-[#8774E1]' : 'text-text-soft',
                  )}
                >
                  <Clock size={10} strokeWidth={2.25} className="shrink-0" />
                  <span className="truncate">{relativeDayTime(lead.nextFollowupAt)}</span>
                </span>
              </>
            )}
          </div>

          <span
            className={cn(
              'shrink-0 rounded-md bg-white/40 px-1.5 py-0.5 text-[10px] font-bold tabular-nums dark:bg-white/[0.07]',
              lead.conversionProbability >= 70
                ? 'text-[#3390EC] dark:text-[#8774E1]'
                : lead.conversionProbability >= 40
                  ? 'text-warm-600 dark:text-warm-400'
                  : 'text-text-soft',
            )}
          >
            {toFa(lead.conversionProbability)}٪
          </span>
        </div>
      </div>
    </article>
  )
}
