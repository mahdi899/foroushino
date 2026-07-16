import { MapPin, Phone, Clock, Flame, Sun, Snowflake, Lock, Info, Undo2, UserRound, Hash } from 'lucide-react'
import type { Lead, Temperature } from '@/types'
import { LeadAvatar } from '@/components/domain/LeadAvatar'
import { PriorityBadge } from './Badges'
import { sourceIcon } from './icons'
import { relativeDayTime, isToday, toFa } from '@/lib/format'
import { leadDisplayCode } from '@/lib/leadCode'
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

const tempPill: Record<Temperature, string> = {
  hot: 'text-hot-600 dark:text-hot-400',
  warm: 'text-warm-700 dark:text-warm-400',
  cold: 'text-cold-600 dark:text-cold-400',
}

const tempIcon = { hot: Flame, warm: Sun, cold: Snowflake }

export function LeadCard({
  lead,
  onClick,
  onCall,
  onQuickView,
  lockedByName,
  assignedAgentLabel,
}: LeadCardProps) {
  const SourceIcon = sourceIcon[lead.source]
  const TempIcon = tempIcon[lead.temperature]
  const overdue =
    lead.nextFollowupAt != null && new Date(lead.nextFollowupAt).getTime() < Date.now()
  const followupToday = lead.nextFollowupAt != null && isToday(lead.nextFollowupAt)
  const lockedByOther = !!lockedByName
  const returned = !!lead.returnedToPool
  const code = leadDisplayCode(lead)

  return (
    <article
      onClick={onClick}
      className={cn(
        'glass-card group relative cursor-pointer overflow-hidden rounded-[18px] border border-white/55',
        'transition-transform active:scale-[0.99] dark:border-white/10',
        lockedByOther && 'ring-1 ring-error-400/25',
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="relative shrink-0">
          <LeadAvatar lead={lead} size={46} ring />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#3390EC] ring-2 ring-background dark:bg-[#8774E1]">
            <SourceIcon size={9} strokeWidth={2.5} className="text-white" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 truncate text-[15px] font-bold leading-snug text-text">
              {lead.firstName} {lead.lastName}
            </h3>
            {lead.priority > 1 && <PriorityBadge priority={lead.priority} />}
            <span
              dir="ltr"
              className="mr-auto inline-flex shrink-0 items-center gap-0.5 rounded-md bg-black/[0.04] px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-text-soft dark:bg-white/[0.06]"
            >
              <Hash size={9} strokeWidth={2.5} />
              {code}
            </span>
          </div>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-text-soft">
            {lead.city && (
              <>
                <span className="inline-flex min-w-0 items-center gap-0.5 truncate">
                  <MapPin size={10} className="shrink-0 opacity-70" strokeWidth={2.25} />
                  <span className="truncate">{lead.city}</span>
                </span>
                <span className="text-text-soft/40">·</span>
              </>
            )}
            <span className={cn('inline-flex shrink-0 items-center gap-0.5', tempPill[lead.temperature])}>
              <TempIcon size={10} strokeWidth={2.5} />
              {temperatureLabels[lead.temperature]}
            </span>
            {lead.nextFollowupAt && (
              <>
                <span className="text-text-soft/40">·</span>
                <span
                  className={cn(
                    'inline-flex min-w-0 items-center gap-0.5 truncate',
                    overdue
                      ? 'text-error-600 dark:text-error-400'
                      : followupToday
                        ? 'text-[#3390EC] dark:text-[#8774E1]'
                        : 'text-text-soft',
                  )}
                >
                  <Clock size={10} strokeWidth={2.25} className="shrink-0" />
                  <span className="truncate">{relativeDayTime(lead.nextFollowupAt)}</span>
                </span>
              </>
            )}
          </div>

          {lead.lastNote && (
            <p className="mt-1 line-clamp-1 text-[11px] leading-5 text-text-muted">{lead.lastNote}</p>
          )}

          {(lockedByOther || returned || assignedAgentLabel) && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {assignedAgentLabel && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-[#3390EC]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#3390EC] dark:text-[#8774E1]">
                  <UserRound size={9} />
                  {assignedAgentLabel}
                </span>
              )}
              {lockedByOther && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-error-500/10 px-1.5 py-0.5 text-[9px] font-bold text-error-600 dark:text-error-400">
                  <Lock size={9} />
                  {lockedByName}
                </span>
              )}
              {returned && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.04] px-1.5 py-0.5 text-[9px] font-bold text-text-soft dark:bg-white/[0.06]">
                  <Undo2 size={9} />
                  برگشت‌خورده
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={cn(
              'text-[12px] font-black tabular-nums leading-none',
              lead.conversionProbability >= 70
                ? 'text-[#3390EC] dark:text-[#8774E1]'
                : lead.conversionProbability >= 40
                  ? 'text-warm-600 dark:text-warm-400'
                  : 'text-text-soft',
            )}
          >
            {toFa(lead.conversionProbability)}٪
          </span>

          <div className="flex items-center gap-1">
            {onQuickView && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onQuickView()
                }}
                aria-label="پیش‌نمایش سریع"
                className="flex h-8 w-8 items-center justify-center rounded-full text-text-soft transition-colors active:bg-black/[0.05] dark:active:bg-white/[0.06]"
              >
                <Info size={15} strokeWidth={2.25} />
              </button>
            )}
            {onCall && (
              <button
                type="button"
                disabled={lockedByOther}
                onClick={(e) => {
                  e.stopPropagation()
                  onCall()
                }}
                aria-label={`تماس با ${lead.firstName} ${lead.lastName}`}
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-full transition-transform active:scale-90',
                  lockedByOther
                    ? 'glass-inset text-text-soft'
                    : 'bg-[#3390EC] text-white shadow-[0_4px_12px_rgba(51,144,236,0.28)] dark:bg-[#8774E1] dark:shadow-[0_4px_12px_rgba(135,116,225,0.24)]',
                )}
              >
                {lockedByOther ? (
                  <Lock size={14} strokeWidth={2.25} />
                ) : (
                  <Phone size={15} strokeWidth={2.35} />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
