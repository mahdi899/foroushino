import { MapPin, Phone, Clock, Flame, Sun, Snowflake } from 'lucide-react'
import type { Lead, LeadSource, Temperature } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { PriorityBadge } from './Badges'
import { sourceIcon } from './icons'
import { relativeDayTime, isToday, toFa } from '@/lib/format'
import { cn } from '@/lib/cn'

interface LeadCardProps {
  lead: Lead
  onClick?: () => void
  onCall?: () => void
}

const sourceTone: Record<LeadSource, string> = {
  instagram: 'bg-secondary-500 text-white',
  website: 'bg-cold-500 text-white',
  telegram: 'bg-cold-500 text-white',
  ads: 'bg-accent-500 text-white',
  webinar: 'bg-secondary-500 text-white',
  form: 'bg-primary-600 text-white',
  excel: 'bg-success-500 text-white',
}

const tempTheme: Record<
  Temperature,
  { glow: string; stripe: string; accent: string; callBtn: string }
> = {
  hot: {
    glow: 'bg-hot-400/20',
    stripe: 'from-hot-500 via-hot-400/60 to-transparent',
    accent: 'text-hot-600',
    callBtn: 'bg-gradient-to-br from-hot-500 to-hot-600 text-white shadow-[0_4px_16px_-4px_rgba(244,63,94,0.45)]',
  },
  warm: {
    glow: 'bg-warm-400/15',
    stripe: 'from-warm-500 via-warm-400/60 to-transparent',
    accent: 'text-warm-600',
    callBtn: 'bg-gradient-to-br from-warm-500 to-warm-600 text-white shadow-[0_4px_16px_-4px_rgba(245,158,11,0.4)]',
  },
  cold: {
    glow: 'bg-cold-400/15',
    stripe: 'from-cold-500 via-cold-400/60 to-transparent',
    accent: 'text-cold-600',
    callBtn:
      'bg-gradient-to-br from-cold-500 to-cold-600 text-white shadow-[0_4px_16px_-4px_rgba(37,99,235,0.4)]',
  },
}

const tempIcon = { hot: Flame, warm: Sun, cold: Snowflake }
const tempLabel = { hot: 'داغ', warm: 'گرم', cold: 'سرد' }

export function LeadCard({ lead, onClick, onCall }: LeadCardProps) {
  const SourceIcon = sourceIcon[lead.source]
  const TempIcon = tempIcon[lead.temperature]
  const theme = tempTheme[lead.temperature]
  const overdue =
    lead.nextFollowupAt != null && new Date(lead.nextFollowupAt).getTime() < Date.now()
  const followupToday = lead.nextFollowupAt != null && isToday(lead.nextFollowupAt)

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-[22px] border border-border/50 bg-surface shadow-card transition-transform active:scale-[0.985]"
    >
      <div className={cn('pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full blur-2xl', theme.glow)} />
      <div
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-[5px] bg-gradient-to-b',
          theme.stripe,
        )}
      />

      <div className="relative p-4 pr-5">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <Avatar
              id={lead.id}
              first={lead.firstName}
              last={lead.lastName}
              src={lead.avatar}
              size={52}
              ring
            />
            <span
              className={cn(
                'absolute -bottom-0.5 -left-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full ring-2 ring-white',
                sourceTone[lead.source],
              )}
            >
              <SourceIcon size={11} strokeWidth={2.5} />
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[16px] font-extrabold leading-snug text-neutral-900">
                {lead.firstName} {lead.lastName}
              </h3>
              {lead.priority > 1 && <PriorityBadge priority={lead.priority} />}
            </div>

            {lead.city && (
              <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-neutral-400">
                <MapPin size={11} className="shrink-0" strokeWidth={2.25} />
                <span className="truncate">{lead.city}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onCall?.()
            }}
            aria-label={`تماس با ${lead.firstName} ${lead.lastName}`}
            className={cn(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-transform active:scale-90',
              theme.callBtn,
            )}
          >
            <Phone size={19} strokeWidth={2.25} />
          </button>
        </div>

        {lead.lastNote && (
          <p className="mt-2.5 line-clamp-1 border-r-2 border-neutral-200 pr-2.5 text-[11px] leading-5 text-neutral-400">
            {lead.lastNote}
          </p>
        )}

        <div
          className={cn(
            'mt-3 flex items-center justify-between gap-3 border-t border-border/50 pt-2.5',
            overdue && 'border-error-100',
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn('inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold', theme.accent)}>
              <TempIcon size={12} strokeWidth={2.25} />
              {tempLabel[lead.temperature]}
            </span>

            {lead.nextFollowupAt && (
              <>
                <span className="h-3 w-px shrink-0 bg-neutral-200" aria-hidden />
                <span
                  className={cn(
                    'flex min-w-0 items-center gap-1 truncate text-[11px] font-bold',
                    overdue ? 'text-error-600' : followupToday ? 'text-primary-700' : 'text-neutral-400',
                  )}
                >
                  <Clock size={12} strokeWidth={2.25} className="shrink-0 opacity-60" />
                  <span className="truncate">{relativeDayTime(lead.nextFollowupAt)}</span>
                </span>
              </>
            )}
          </div>

          <span
            className={cn(
              'shrink-0 text-[11px] font-extrabold tabular-nums',
              lead.conversionProbability >= 70
                ? 'text-primary-600'
                : lead.conversionProbability >= 40
                  ? 'text-warm-600'
                  : 'text-neutral-400',
            )}
          >
            {toFa(lead.conversionProbability)}٪
          </span>
        </div>
      </div>
    </div>
  )
}
